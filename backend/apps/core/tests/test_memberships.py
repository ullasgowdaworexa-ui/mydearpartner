import pytest
from django.utils import timezone
from apps.core.models import MembershipPlan, MembershipRequest, MemberMembership
from apps.accounts.models import Member, SuperAdmin, Admin

pytestmark = pytest.mark.django_db

@pytest.fixture
def plan(db):
    plan, _ = MembershipPlan.objects.get_or_create(
        slug='platinum',
        defaults={
            'name': 'Platinum',
            'price': 4999.00,
            'duration': '6 Months',
            'features': ['Unlimited views', 'Priority support'],
            'duration_days': 180,
            'is_active': True,
        }
    )
    return plan

def test_member_membership_request_creation(authenticated_client, member, plan):
    client = authenticated_client(member)
    response = client.post(
        '/api/v1/memberships/request/',
        {'plan_slug': 'platinum'},
        format='json'
    )
    assert response.status_code == 201, response.data
    assert response.data['success'] is True
    assert response.data['data']['status'] == 'pending'
    
    # Check duplicate pending request is blocked
    response_dup = client.post(
        '/api/v1/memberships/request/',
        {'plan_slug': 'platinum'},
        format='json'
    )
    assert response_dup.status_code == 400
    assert response_dup.data['success'] is False

def test_admin_list_membership_requests(authenticated_client, admin_account, member, plan):
    # Setup a pending request
    req = MembershipRequest.objects.create(
        user=member,
        selected_plan=plan,
        status='pending'
    )
    
    client = authenticated_client(admin_account)
    response = client.get('/api/v1/admin/membership-requests/')
    assert response.status_code == 200
    assert response.data['success'] is True
    assert len(response.data['data']['results']) == 1
    assert response.data['data']['results'][0]['id'] == str(req.pk)

def test_admin_approve_membership_request(authenticated_client, admin_account, member, plan):
    # Setup pending request
    req = MembershipRequest.objects.create(
        user=member,
        selected_plan=plan,
        status='pending'
    )
    
    client = authenticated_client(admin_account)
    response = client.patch(
        f'/api/v1/admin/membership-requests/{req.pk}/',
        {'action': 'approve'},
        format='json'
    )
    assert response.status_code == 200, response.data
    assert response.data['success'] is True
    
    # Verify request updated
    req.refresh_from_db()
    assert req.status == 'approved'
    assert req.is_active is True
    
    # Verify user premium status & active membership
    member.refresh_from_db()
    assert member.is_premium is True
    
    membership = MemberMembership.objects.get(member=member, is_active=True)
    assert membership.plan == plan
    assert membership.is_active is True

def test_admin_reject_membership_request(authenticated_client, admin_account, member, plan):
    req = MembershipRequest.objects.create(
        user=member,
        selected_plan=plan,
        status='pending'
    )
    
    client = authenticated_client(admin_account)
    # Reject without reason should fail
    response_fail = client.patch(
        f'/api/v1/admin/membership-requests/{req.pk}/',
        {'action': 'reject'},
        format='json'
    )
    assert response_fail.status_code == 400
    
    # Reject with reason
    response = client.patch(
        f'/api/v1/admin/membership-requests/{req.pk}/',
        {'action': 'reject', 'rejection_reason': 'Invalid documentation'},
        format='json'
    )
    assert response.status_code == 200, response.data
    
    req.refresh_from_db()
    assert req.status == 'rejected'
    assert req.rejection_reason == 'Invalid documentation'
    assert req.is_active is False
    
    member.refresh_from_db()
    assert member.is_premium is False

def test_admin_direct_membership_override(authenticated_client, admin_account, member, plan):
    client = authenticated_client(admin_account)
    
    # Direct activate plan
    response = client.post(
        '/api/v1/admin/memberships/direct/',
        {
            'user_id': str(member.pk),
            'plan_slug': 'platinum',
            'action': 'activate',
            'duration_days': 60
        },
        format='json'
    )
    assert response.status_code == 200, response.data
    
    member.refresh_from_db()
    assert member.is_premium is True
    membership = MemberMembership.objects.get(member=member, is_active=True)
    assert membership.plan == plan
    
    # Direct extend plan
    response_ext = client.post(
        '/api/v1/admin/memberships/direct/',
        {
            'user_id': str(member.pk),
            'action': 'extend',
            'duration_days': 30
        },
        format='json'
    )
    assert response_ext.status_code == 200, response_ext.data
    membership.refresh_from_db()
    delta = membership.end_date - timezone.now()
    assert 88 <= delta.days <= 91
    
    # Direct cancel plan
    response_cancel = client.post(
        '/api/v1/admin/memberships/direct/',
        {
            'user_id': str(member.pk),
            'action': 'cancel'
        },
        format='json'
    )
    assert response_cancel.status_code == 200, response_cancel.data
    
    member.refresh_from_db()
    assert member.is_premium is False
    assert MemberMembership.objects.filter(member=member, is_active=True).exists() is False
