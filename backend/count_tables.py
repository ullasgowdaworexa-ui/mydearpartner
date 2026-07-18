#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.db import connection

print("=" * 80)
print("DATABASE TABLES COUNT")
print("=" * 80)

# Get all tables
cursor = connection.cursor()
cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
""")

tables = cursor.fetchall()

print(f"\n📊 TOTAL TABLES: {len(tables)}\n")

# Group by app
apps = {}
for table_name in tables:
    table = table_name[0]
    if '_' in table:
        app = table.split('_')[0]
    else:
        app = 'django'
    
    if app not in apps:
        apps[app] = []
    apps[app].append(table)

# Print by app
for app in sorted(apps.keys()):
    print(f"\n{app.upper()} ({len(apps[app])} tables):")
    for table in sorted(apps[app]):
        print(f"  • {table}")

print("\n" + "=" * 80)
print(f"✅ TOTAL: {len(tables)} tables")
print("=" * 80)
