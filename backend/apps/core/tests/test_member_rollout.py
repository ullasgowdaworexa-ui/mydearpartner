from datetime import timedelta

import pytest
from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.test import override_settings
from django.utils import timezone

from apps.accounts.security import issue_account_tokens
from apps.core.middleware import JWTAuthMiddleware
from apps.core.models import ChatMessage, MemberMembership, MembershipPlan
from apps.core.routing import websocket_urlpatterns


pytestmark = pytest.mark.django_db

IN_MEMORY_CHANNEL_LAYER = {
    'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
}


@override_settings(REQUIRE_MEMBER_VERIFICATION=False, ENABLE_ADMIN_PORTAL=False)
def test_unverified_members_can_activate_a_plan_browse_and_chat(
    authenticated_client, member, other_member
):
    """The temporary member rollout has no review gate but keeps plan access."""

    plan = MembershipPlan.objects.create(
        name='Gold',
        display_name='Gold',
        slug='gold-rollout-test',
        price=999,
        duration='30 days',
        duration_days=30,
        features=[],
        can_message=True,
        is_active=True,
    )
    member.gender = 'Male'
    other_member.gender = 'Female'
    member.save(update_fields=['gender'])
    other_member.save(update_fields=['gender'])

    client = authenticated_client(member)
    activation = client.post(
        '/api/v1/member-auth/membership/activate/',
        {'plan_slug': plan.slug},
        format='json',
    )

    assert activation.status_code == 200, activation.data
    assert activation.data['data']['status'] == 'active'
    membership = MemberMembership.objects.get(member=member)
    assert membership.status == MemberMembership.MembershipStatus.ACTIVE
    assert membership.is_active is True
    member.refresh_from_db()
    assert member.is_premium is True

    profiles = client.get('/api/v1/profiles/')
    assert profiles.status_code == 200, profiles.data
    profile_ids = {row['id'] for row in profiles.data['data']['results']}
    assert str(other_member.pk) in profile_ids

    message = client.post(
        f'/api/v1/conversations/{other_member.pk}/messages/',
        {'text': 'Hello from an unverified member'},
        format='json',
    )
    assert message.status_code == 201, message.data
    assert message.data['data']['receiver_id'] == str(other_member.pk)


@override_settings(ENABLE_ADMIN_PORTAL=False)
def test_paused_admin_portal_returns_not_found(authenticated_client, member):
    client = authenticated_client(member)

    assert client.get('/api/v1/admin/dashboard/').status_code == 404
    assert client.get('/api/v1/admin-auth/login/').status_code == 404
    assert client.get('/django-admin/').status_code == 404


@override_settings(
    REQUIRE_MEMBER_VERIFICATION=False,
    CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYER,
)
@pytest.mark.django_db(transaction=True)
def test_unverified_members_can_use_the_authenticated_chat_socket(member, other_member):
    plan = MembershipPlan.objects.create(
        name='Chat',
        slug='chat-rollout-test',
        price=1,
        duration='30 days',
        duration_days=30,
        features=[],
        can_message=True,
    )
    MemberMembership.objects.create(
        member=member,
        plan=plan,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=30),
        is_active=True,
        status=MemberMembership.MembershipStatus.ACTIVE,
    )
    access = issue_account_tokens(member)['access']

    async def scenario():
        communicator = WebsocketCommunicator(
            JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
            f'/ws/chat/{other_member.pk}/',
            subprotocols=['access_token', access],
        )
        connected, negotiated_protocol = await communicator.connect()
        assert connected is True
        assert negotiated_protocol == 'access_token'
        await communicator.send_json_to({'text': 'Socket chat is live'})
        message = await communicator.receive_json_from()
        assert message['text'] == 'Socket chat is live'
        assert message['receiver_id'] == str(other_member.pk)
        await communicator.disconnect()

    async_to_sync(scenario)()
    assert ChatMessage.objects.filter(
        sender=member,
        receiver=other_member,
        text='Socket chat is live',
    ).exists()
