import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from apps.accounts.models import Admin, CustomerSupportAgent, Member, Staff, SuperAdmin


pytestmark = pytest.mark.django_db


def test_account_creation_commands_hash_passwords():
    password = 'CommandPassword!971'
    common = {
        'mobile_number': '9876543250',
        'first_name': 'Command',
        'last_name': 'Created',
        'password': password,
    }
    call_command('create_super_admin', email='owner-command@example.com', **common)
    owner = SuperAdmin.objects.get(email='owner-command@example.com')
    assert owner.check_password(password)
    assert owner.password != password


def test_baseline_contains_no_sample_accounts(db):
    assert not Member.objects.exists()
    assert not SuperAdmin.objects.exists()
    assert not Admin.objects.exists()
    assert not Staff.objects.exists()
    assert not CustomerSupportAgent.objects.exists()


@override_settings(DEBUG=False, ALLOW_DESTRUCTIVE_DEV_RESET=True)
def test_rebuild_refuses_when_debug_is_false():
    with pytest.raises(CommandError, match='DEBUG=False'):
        call_command('rebuild_development_database', confirm=':memory:')


@override_settings(DEBUG=True, ALLOW_DESTRUCTIVE_DEV_RESET=False)
def test_rebuild_requires_explicit_destructive_flag():
    with pytest.raises(CommandError, match='ALLOW_DESTRUCTIVE_DEV_RESET'):
        call_command('rebuild_development_database', confirm=':memory:')
