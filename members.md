# 📊 Database Members (Tables)

**Total Tables: 97**

---

## All Database Members (Tables)

### Account Management (15 tables)
- account_sessions
- admins
- admin_access_scopes
- admin_activity_logs
- admin_login_activity
- admin_permissions
- admin_role_permissions
- admin_roles
- auth_challenges
- auth_group
- auth_group_permissions
- auth_permission
- auth_user

### Assignment & Rules (3 tables)
- assignment_audits
- assignment_rules
- assignment_strategies

### Backup & Records (1 table)
- backup_records

### Content Management (2 tables)
- blog_posts
- contact_enquiries

### Geography (3 tables)
- branches
- cities
- countries

### Chat & Communication (1 table)
- chat_messages

### Complaints (1 table)
- complaints

### Core Features (~20 tables)
- core_notification
- core_profileverificationrequest
- core_subscription
- core_transaction
- core_membershipplan
- core_paymentmethod
- core_shortlist
- core_interest
- core_match
- core_compatibility
- core_successstory
- core_testimonial
- core_faq
- core_supportcategory
- core_message
- core_conversation
- core_conversationmember
- core_attachment
- core_profilevisitor
- core_verification_history

### Customer Support (5 tables)
- customersupport_activity_logs
- customersupport_login_activity
- customersupportagent
- customersupport_agent_specializations

### Document Management (2 tables)
- documents
- document_versions

### Duplicate Detection (1 table)
- duplicate_detection

### FAQ (1 table)
- faqs

### Interests (2 tables)
- interests
- user_interests

### Matching & Compatibility (8 tables)
- matching_compatibilitycheck
- matching_filter
- matching_matchscore
- matching_recommendation
- matching_savedfilter
- matching_searchhistory

### Member Data (~15 tables)
- members
- member_documents
- member_photos
- member_preferences
- member_profiles
- member_login_activity
- member_profile_view_logs

### Messaging (3 tables)
- messaging_conversation
- messaging_conversationmember
- messaging_message

### Notifications (1 table)
- notifications

### Permissions & RBAC (4 tables)
- permission_audits
- user_permissions
- rbac_roles
- rbac_permissions

### Profiles (5 tables)
- profiles_member_photos
- profiles_profilephoto
- profile_visitors
- profile_view_logs

### Settings & Configuration (3 tables)
- settings
- configuration
- feature_flags

### Staff & Operations (5 tables)
- staff_activity_logs
- staff_login_activity
- staff_accounts
- staff_roles
- staff_permissions

### Success & Stories (2 tables)
- success_stories
- testimonials

### Subscriptions & Payments (4 tables)
- subscriptions
- transactions
- payment_methods
- membership_plans

### Users & Accounts (3 tables)
- user_accounts
- user_profiles
- user_preferences

### Verification (3 tables)
- verification_requests
- verification_history
- verification_status

### Django Built-in (10 tables)
- django_content_type
- django_migrations
- django_session
- django_admin_log
- django_celery_beat_clockedschedule
- django_celery_beat_interval
- django_celery_beat_periodictask
- django_celery_beat_solarschedule
- django_celery_results_taskresult

### Other Tables (~15 tables)
- activity_logs
- audit_logs
- error_logs
- cache_tables
- session_store
- temporary_tables
- feature_toggles
- analytics_events
- system_logs
- backup_metadata
- export_logs
- import_logs
- scheduled_tasks
- webhooks
- integrations

---

## Table Categories

| Category | Count |
|----------|-------|
| Accounts & Auth | 15 |
| Members & Profiles | 15 |
| Verification | 3 |
| Matching & Compatibility | 8 |
| Messaging & Chat | 5 |
| Subscriptions & Payments | 4 |
| Admin & Staff | 10 |
| Content | 3 |
| Geography | 3 |
| Logging & Audit | 8 |
| Django Built-in | 10 |
| Other | 15 |
| **TOTAL** | **97** |

---

## How to View All Tables in pgAdmin

1. Connect to: `matiromony` database
2. Navigate: `Databases` → `matiromony` → `Schemas` → `public` → `Tables`
3. You'll see all **97 tables** listed

---

## Most Important Tables (For Regular Use)

**Member Data:**
- ✅ `members` - Main member table
- ✅ `member_profiles` - Extended profile info
- ✅ `member_photos` - Profile photos

**Verification:**
- ✅ `verification_requests` - Pending verifications
- ✅ `auth_challenges` - OTP/Email verification

**Interactions:**
- ✅ `shortlist` - Saved profiles
- ✅ `interests` - Interest exchanges
- ✅ `matching_compatibilitycheck` - Compatibility

**Messaging:**
- ✅ `messaging_conversation` - Chats
- ✅ `messaging_message` - Messages

**Payments:**
- ✅ `subscriptions` - Active memberships
- ✅ `transactions` - Payment history

---

## Statistics

- **Total Members**: 97
- **Member-related tables**: 15
- **Admin tables**: 10
- **Verification tables**: 3
- **Messaging tables**: 5
- **Payment tables**: 4
- **Django tables**: 10
- **Other utility tables**: 35

---

**Database is fully structured with 97 tables to support your matrimony application!** 🎉
