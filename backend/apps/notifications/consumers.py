import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from apps.accounts.models import AccountType

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Unified WebSocket consumer for real-time notifications.

    Supports all user types:
      - Member
      - SuperAdmin
      - Admin
      - Staff
      - CustomerSupportAgent

    Channels are registered in role-based groups for permission-aware
    event delivery and a personal group (user_{id}) for private events.
    """

    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        if not user.is_active or getattr(user, "deleted_at", None) is not None:
            await self.close(code=4403)
            return

        account_type = await self._get_account_type()

        if not account_type:
            await self.close(code=4403)
            return

        self.account_type = account_type
        self.account_id = str(user.pk)
        self.joined_groups = []

        personal_group = f"user_{self.account_id}"
        self.joined_groups.append(personal_group)
        await self.channel_layer.group_add(personal_group, self.channel_name)

        role_group = self._role_group(account_type)
        if role_group:
            self.joined_groups.append(role_group)
            await self.channel_layer.group_add(role_group, self.channel_name)

        await self.accept()

        await self.send_json({
            "type": "connection.established",
            "message": "Real-time connection established",
            "data": {
                "user_id": self.account_id,
                "role": account_type,
            },
        })

        if settings.DEBUG:
            logger.info(
                "WS connected: user=%s type=%s groups=%s",
                self.account_id,
                account_type,
                self.joined_groups,
            )

    async def disconnect(self, close_code):
        for group_name in getattr(self, "joined_groups", []):
            await self.channel_layer.group_discard(group_name, self.channel_name)

        if settings.DEBUG:
            logger.info(
                "WS disconnected: user=%s code=%s",
                getattr(self, "account_id", None),
                close_code,
            )

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong"})

    async def notification_message(self, event):
        payload = event.get("payload", event)
        await self.send_json(payload)

    def _role_group(self, account_type):
        mapping = {
            AccountType.SUPER_ADMIN: "role_super_admin",
            AccountType.ADMIN: "role_admin",
            AccountType.STAFF: "role_staff",
            AccountType.CUSTOMER_SUPPORT: "role_support",
            AccountType.MEMBER: "role_member",
        }
        return mapping.get(str(account_type))

    @database_sync_to_async
    def _get_account_type(self):
        user = self.scope.get("user")
        if not user:
            return None

        if hasattr(user, "account_type"):
            account_type = user.account_type
            if account_type and str(account_type) in AccountType.values:
                return str(account_type)

        return None
