import pytest
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import (
    AccountType,
    AdminLoginActivity,
    AuthSession,
    CustomerSupportLoginActivity,
    MemberLoginActivity,
    StaffLoginActivity,
    SuperAdminLoginActivity,
)
from apps.accounts.security import issue_account_tokens

from apps.conftest import PASSWORD


pytestmark = pytest.mark.django_db


def test_member_can_login_with_email_or_mobile(api_client, member):
    for identifier in (member.email, member.mobile_number):
        response = api_client.post(
            '/api/v1/member-auth/login/',
            {'identifier': identifier, 'password': PASSWORD},
            format='json',
        )
        assert response.status_code == 200
        payload = response.data['data']
        claims = AccessToken(payload['access'])
        assert claims['account_id'] == str(member.pk)
        assert claims['account_type'] == AccountType.MEMBER
        assert claims['session_id'] == payload['session_id']
        assert claims['token_version'] == member.token_version
    assert MemberLoginActivity.objects.filter(member=member, login_status='SUCCESS').count() == 2


@pytest.mark.parametrize(
    ('fixture_name', 'path', 'account_type', 'activity_model'),
    (
        ('super_admin', '/api/v1/super-admin-auth/login/', AccountType.SUPER_ADMIN, SuperAdminLoginActivity),
        ('admin_account', '/api/v1/admin-auth/login/', AccountType.ADMIN, AdminLoginActivity),
        ('staff_account', '/api/v1/staff-auth/login/', AccountType.STAFF, StaffLoginActivity),
        ('support_account', '/api/v1/customer-support-auth/login/', AccountType.CUSTOMER_SUPPORT, CustomerSupportLoginActivity),
    ),
)
def test_each_administrative_table_has_its_own_login(
    request, api_client, fixture_name, path, account_type, activity_model
):
    account = request.getfixturevalue(fixture_name)
    response = api_client.post(path, {'email': account.email, 'password': PASSWORD}, format='json')
    assert response.status_code == 200
    claims = AccessToken(response.data['data']['access'])
    assert claims['account_type'] == account_type
    assert claims['account_id'] == str(account.pk)
    assert activity_model.objects.filter(login_status='SUCCESS').count() == 1


def test_failed_login_attempt_is_recorded_without_sensitive_values(api_client, member):
    response = api_client.post(
        '/api/v1/member-auth/login/',
        {'identifier': member.email, 'password': 'wrong-password'},
        format='json',
    )
    assert response.status_code == 401
    event = MemberLoginActivity.objects.get()
    assert event.login_identifier == member.email
    assert event.failure_reason == 'Invalid credentials'
    assert 'wrong-password' not in str(event.__dict__)


def test_refresh_token_is_rejected_by_another_account_namespace(api_client, member):
    login = api_client.post(
        '/api/v1/member-auth/login/',
        {'identifier': member.email, 'password': PASSWORD},
        format='json',
    )
    refresh = login.data['data']['refresh']
    response = api_client.post('/api/v1/admin-auth/token/refresh/', {'refresh': refresh}, format='json')
    assert response.status_code == 401


def test_me_endpoint_enforces_token_account_type(authenticated_client, member):
    client = authenticated_client(member)
    assert client.get('/api/v1/member-auth/me/').status_code == 200
    assert client.get('/api/v1/admin-auth/me/').status_code == 403


@pytest.mark.parametrize(
    'path',
    (
        '/api/v1/admin/dashboard/',
        '/api/v1/admin/users/',
        '/api/v1/admin/tickets/',
        '/api/v1/admin/verifications/',
        '/api/v1/super-admin/admins/',
        '/api/v1/staff/verifications/',
        '/api/v1/customer-support/tickets/',
    ),
)
def test_member_is_blocked_from_all_operational_namespaces(authenticated_client, member, path):
    assert authenticated_client(member).get(path).status_code == 403


def test_cross_role_operational_isolation(
    authenticated_client, staff_account, support_account, admin_account
):
    assert authenticated_client(staff_account).get('/api/v1/admin/dashboard/').status_code == 403
    assert authenticated_client(staff_account).get('/api/v1/customer-support/tickets/').status_code == 403
    assert authenticated_client(support_account).get('/api/v1/staff/verifications/').status_code == 403
    assert authenticated_client(admin_account).get('/api/v1/super-admin/admins/').status_code == 403


def test_logout_revokes_refresh_session_without_access_header(api_client, member):
    login = api_client.post(
        '/api/v1/member-auth/login/',
        {'identifier': member.email, 'password': PASSWORD},
        format='json',
    ).data['data']
    response = api_client.post('/api/v1/member-auth/logout/', {'refresh': login['refresh']}, format='json')
    assert response.status_code == 200
    refresh = api_client.post(
        '/api/v1/member-auth/token/refresh/', {'refresh': login['refresh']}, format='json'
    )
    assert refresh.status_code == 401


@pytest.mark.parametrize(
    ('fixture_name', 'namespace'),
    (
        ('member', 'member-auth'),
        ('super_admin', 'super-admin-auth'),
        ('admin_account', 'admin-auth'),
        ('staff_account', 'staff-auth'),
        ('support_account', 'customer-support-auth'),
    ),
)
def test_logout_all_is_authenticated_typed_and_revokes_every_session(
    request, api_client, fixture_name, namespace
):
    account = request.getfixturevalue(fixture_name)
    original_version = account.token_version
    first = issue_account_tokens(account)
    second = issue_account_tokens(account)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {first['access']}")

    response = api_client.post(f'/api/v1/{namespace}/logout-all/', format='json')

    assert response.status_code == 200, response.data
    account.refresh_from_db()
    assert account.token_version == original_version + 1
    assert not AuthSession.objects.filter(
        account_id=account.pk,
        account_type=str(account.account_type),
        revoked_at__isnull=True,
    ).exists()

    api_client.credentials()
    refresh = api_client.post(
        f'/api/v1/{namespace}/token/refresh/',
        {'refresh': second['refresh']},
        format='json',
    )
    assert refresh.status_code == 401


def test_logout_all_rejects_a_token_from_another_namespace(authenticated_client, member):
    original_version = member.token_version
    response = authenticated_client(member).post('/api/v1/admin-auth/logout-all/', format='json')

    assert response.status_code == 403
    member.refresh_from_db()
    assert member.token_version == original_version
