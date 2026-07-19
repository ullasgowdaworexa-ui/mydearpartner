#!/usr/bin/env python
"""Unlock admin accounts that are temporarily locked."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import SuperAdmin, Admin

# Unlock SuperAdmin
try:
    sa = SuperAdmin.objects.get(email='admin@example.com')
    sa.failed_login_attempts = 0
    sa.locked_until = None
    sa.save(update_fields=['failed_login_attempts', 'locked_until', 'updated_at'])
    print(f'✓ SuperAdmin account unlocked')
    print(f'  Email: {sa.email}')
    print(f'  Failed attempts reset to: {sa.failed_login_attempts}')
    print(f'  Is locked: {sa.is_account_locked}')
except SuperAdmin.DoesNotExist:
    print('✗ SuperAdmin not found')

print()

# Unlock Admin
try:
    admin = Admin.objects.get(email='staffadmin@example.com')
    admin.failed_login_attempts = 0
    admin.locked_until = None
    admin.save(update_fields=['failed_login_attempts', 'locked_until', 'updated_at'])
    print(f'✓ Admin account unlocked')
    print(f'  Email: {admin.email}')
    print(f'  Failed attempts reset to: {admin.failed_login_attempts}')
    print(f'  Is locked: {admin.is_account_locked}')
except Admin.DoesNotExist:
    print('✗ Admin not found')

print('\n✓ All accounts have been unlocked successfully!')
