#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member
from django.db import connection

print("=" * 60)
print("MEMBERS TABLE STATUS CHECK")
print("=" * 60)

# Check if table exists
cursor = connection.cursor()
cursor.execute("SELECT to_regclass('members')")
table_result = cursor.fetchone()

if table_result and table_result[0]:
    print("\n✅ MEMBERS TABLE EXISTS")
    
    # Get table info
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'members'
        LIMIT 5
    """)
    
    print("\n📊 Table Columns:")
    for row in cursor.fetchall():
        print(f"   • {row[0]}: {row[1]}")
    
    # Count records
    count = Member.objects.count()
    print(f"\n📈 Records: {count}")
    
    print("\n" + "=" * 60)
    print("✅ STATUS: MEMBERS TABLE RESTORED SUCCESSFULLY!")
    print("=" * 60)
else:
    print("\n❌ MEMBERS TABLE NOT FOUND")
    print("=" * 60)
