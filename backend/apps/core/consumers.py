import json
from uuid import UUID

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

from apps.accounts.models import AccountType, Member

from .models import ChatMessage


MAX_CHAT_PAYLOAD_BYTES = 16 * 1024
MAX_CHAT_MESSAGE_LENGTH = 4000

CLOSE_UNAUTHENTICATED = 4001
CLOSE_SELF_CONVERSATION = 4002
CLOSE_PARTNER_UNAVAILABLE = 4003
CLOSE_MESSAGING_NOT_ALLOWED = 4004
CLOSE_INVALID_PAYLOAD = 4400
CLOSE_PAYLOAD_TOO_LARGE = 4409


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        self.partner_id = self.scope['url_route']['kwargs'].get('user_id')

        if (
            not self.user
            or not self.user.is_authenticated
            or str(getattr(self.user, 'account_type', '')) != AccountType.MEMBER
            or not self.partner_id
        ):
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        if str(self.user.id) == str(self.partner_id):
            await self.close(code=CLOSE_SELF_CONVERSATION)
            return

        try:
            self.partner_id = str(UUID(str(self.partner_id)))
        except (TypeError, ValueError, AttributeError):
            await self.close(code=CLOSE_PARTNER_UNAVAILABLE)
            return

        denial_code = await self._connection_denial_code()
        if denial_code:
            await self.close(code=denial_code)
            return

        self.room_name = self._make_room_name(str(self.user.id), str(self.partner_id))
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept(subprotocol=self.scope.get('jwt_subprotocol'))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_name'):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data is not None or text_data is None:
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return
        try:
            payload_size = len(text_data.encode('utf-8'))
        except UnicodeEncodeError:
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return
        if payload_size > MAX_CHAT_PAYLOAD_BYTES:
            await self.close(code=CLOSE_PAYLOAD_TOO_LARGE)
            return

        try:
            payload = json.loads(text_data)
        except (json.JSONDecodeError, RecursionError, TypeError):
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return

        if not isinstance(payload, dict):
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return

        if payload.get('type') == 'read_receipt':
            message_ids = payload.get('message_ids')
            if message_ids is None and payload.get('message_id') is not None:
                message_ids = [payload.get('message_id')]
            if not isinstance(message_ids, list) or not message_ids or len(message_ids) > 100:
                await self.close(code=CLOSE_INVALID_PAYLOAD)
                return
            normalized_ids = [str(value) for value in message_ids]
            if any(not value for value in normalized_ids):
                await self.close(code=CLOSE_INVALID_PAYLOAD)
                return
            read_ids = await self._mark_messages_read(normalized_ids)
            if read_ids:
                await self.channel_layer.group_send(
                    self.room_name,
                    {
                        'type': 'chat.read_receipt',
                        'message_ids': read_ids,
                        'reader_id': str(self.user.id),
                    },
                )
            return

        if not isinstance(payload.get('text'), str):
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return

        text = payload['text'].strip()
        try:
            text.encode('utf-8')
        except UnicodeEncodeError:
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return
        if not text or '\x00' in text:
            await self.close(code=CLOSE_INVALID_PAYLOAD)
            return
        if len(text) > MAX_CHAT_MESSAGE_LENGTH:
            await self.close(code=CLOSE_PAYLOAD_TOO_LARGE)
            return

        message, denial_code = await self._create_message_if_allowed(text)
        if denial_code:
            await self.close(code=denial_code)
            return

        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': 'chat.message',
                'message': message,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    async def chat_read_receipt(self, event):
        payload = {
            'type': 'read_receipt',
            'message_ids': event['message_ids'],
            'reader_id': event['reader_id'],
        }
        if len(event['message_ids']) == 1:
            payload['message_id'] = event['message_ids'][0]
        await self.send(text_data=json.dumps(payload))

    @database_sync_to_async
    def _connection_denial_code(self):
        sender = Member.objects.filter(
            id=self.user.id,
            is_active=True,
            deleted_at__isnull=True,
        ).first()
        if sender is None:
            return CLOSE_UNAUTHENTICATED

        partner_filters = {
            'id': self.partner_id,
            'is_active': True,
            'deleted_at__isnull': True,
            'account_status': Member.AccountStatus.ACTIVE,
            'is_hidden': False,
        }
        if getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False):
            partner_filters['profile_status'] = Member.ProfileStatus.APPROVED
        partner = Member.objects.filter(**partner_filters).first()
        if partner is None:
            return CLOSE_PARTNER_UNAVAILABLE

        from apps.core.entitlement_service import MembershipEntitlementService
        allowed, _reason = MembershipEntitlementService.can_message(sender, partner)
        if not allowed:
            return CLOSE_MESSAGING_NOT_ALLOWED

        return None

    @database_sync_to_async
    def _create_message_if_allowed(self, text):
        sender = Member.objects.filter(
            id=self.user.id,
            is_active=True,
            deleted_at__isnull=True,
        ).first()
        if sender is None:
            return None, CLOSE_UNAUTHENTICATED

        partner_filters = {
            'id': self.partner_id,
            'is_active': True,
            'deleted_at__isnull': True,
            'account_status': Member.AccountStatus.ACTIVE,
            'is_hidden': False,
        }
        if getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False):
            partner_filters['profile_status'] = Member.ProfileStatus.APPROVED
        partner = Member.objects.filter(**partner_filters).first()
        if partner is None:
            return None, CLOSE_PARTNER_UNAVAILABLE

        from apps.core.entitlement_service import MembershipEntitlementService
        allowed, _reason = MembershipEntitlementService.can_message(sender, partner)
        if not allowed:
            return None, CLOSE_MESSAGING_NOT_ALLOWED

        message = ChatMessage.objects.create(sender=sender, receiver=partner, text=text)
        return {
            'id': str(message.id),
            'sender_id': str(message.sender_id),
            'receiver_id': str(message.receiver_id),
            'text': message.text,
            'created_at': message.created_at.isoformat(),
            'is_read': message.is_read,
        }, None

    @database_sync_to_async
    def _mark_messages_read(self, message_ids):
        messages = list(
            ChatMessage.objects.filter(
                id__in=message_ids,
                sender_id=self.partner_id,
                receiver_id=self.user.id,
                is_read=False,
            )
        )
        if not messages:
            return []
        ids = [str(message.id) for message in messages]
        ChatMessage.objects.filter(id__in=ids).update(is_read=True)
        return ids

    @staticmethod
    def _make_room_name(user_a, user_b):
        ordered = sorted([user_a, user_b])
        return f'chat_{ordered[0]}_{ordered[1]}'
