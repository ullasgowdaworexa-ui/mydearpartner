#!/usr/bin/env python
"""Reset admin passwords to the test default."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import SuperAdmin, Admin

PASSWORD = 'TestPassword!742'

# Reset SuperAdmin password
try:
    sa = SuperAdmin.objects.get(email='admin@example.com')
    sa.set_password(PASSWORD)
    sa.save()
    print(f'✓ SuperAdmin password reset')
    print(f'  Email: {sa.email}')
    print(f'  Password: {PASSWORD}')
except SuperAdmin.DoesNotExist:
    print('✗ SuperAdmin not found')

print()

# Reset Admin password
try:
    admin = Admin.objects.get(email='staffadmin@example.com')
    admin.set_password(PASSWORD)
    admin.save()
    print(f'✓ Admin password reset')
    print(f'  Email: {admin.email}')
    print(f'  Password: {PASSWORD}')
except Admin.DoesNotExist:
    print('✗ Admin not found')

print('\nPasswords have been reset successfully!')
