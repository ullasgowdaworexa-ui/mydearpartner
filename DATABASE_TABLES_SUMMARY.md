# 📊 Database Tables Summary

## Total Tables Count

**Total: ~80+ tables** across the entire matrimony application

---

## Tables by Application

### 👥 ACCOUNTS APP (~25 tables)

**User Management:**
- `accounts_member` - Member profiles
- `accounts_user` - Custom user model
- `accounts_admin` - Admin accounts
- `accounts_staff` - Staff accounts
- `accounts_superadmin` - Super admin accounts
- `accounts_customersupportagent` - Support agents

**Authentication & Authorization:**
- `accounts_authchallenge` - OTP challenges
- `accounts_authsession` - Auth sessions
- `admin_roles` - Admin roles (Super Admin, Admin, Staff, Support)
- `admin_permissions` - Admin permissions
- `admin_role_permissions` - Role-permission mapping

**Activity & Logging:**
- `admin_login_activity` - Admin login history
- `member_login_activity` - Member login history
- `staff_login_activity` - Staff login history
- `admin_activity_log` - Admin actions
- `staff_activity_log` - Staff actions
- `superadmin_activity_log` - Super admin actions
- `customer_support_activity_log` - Support actions

**Documents & Media:**
- `accounts_document` - Member documents
- `member_documents` - Documents storage
- `member_photos` - Photo storage
- `accounts_memberdocument` - Document metadata

**Other:**
- `accounts_memberpreference` - Member preferences
- `accounts_memberprofile` - Member extended profile
- `accounts_duplicatedetection` - Duplicate prevention
- `accounts_profileviewlog` - Profile view tracking

---

### 💍 PROFILES APP (~8 tables)

**Profile Management:**
- `profiles_profilephoto` - Profile photos
- `profiles_member_photos` - Photo relationship

**Photo Storage:**
- `legacy_profile_photos` - Legacy photos

---

### 📬 CORE APP (~20 tables)

**Verification:**
- `core_profileverificationrequest` - Verification requests
- `core_verification_history` - Verification history
- `core_verification_status` - Status tracking

**Membership:**
- `core_membershipplan` - Membership plans
- `core_subscription` - Member subscriptions
- `core_paymentmethod` - Payment methods
- `core_transaction` - Payment transactions

**Matching & Interactions:**
- `core_shortlist` - Member shortlists
- `core_interest` - Member interests
- `core_match` - Match suggestions
- `core_compatibility` - Compatibility scores

**Support & Communication:**
- `core_notification` - Notifications
- `core_contactenquiry` - Contact inquiries
- `core_message` - Direct messages
- `core_successstory` - Success stories

**Admin Features:**
- `core_testimonial` - Testimonials
- `core_blogpost` - Blog posts
- `core_faq` - FAQs
- `core_supportcategory` - Support categories

---

### 💬 MESSAGING APP (~5 tables)

**Chat & Messaging:**
- `messaging_conversation` - Conversations
- `messaging_message` - Messages
- `messaging_attachment` - Message attachments
- `messaging_conversationmember` - Conversation participants

---

### 🔗 MATCHING APP (~8 tables)

**Compatibility & Matching:**
- `matching_compatibilitycheck` - Compatibility checks
- `matching_matchscore` - Match scoring
- `matching_filter` - Search filters
- `matching_searchhistory` - Search history
- `matching_savedfilter` - Saved searches
- `matching_recommendation` - Recommendations

---

### 🔐 DJANGO CORE TABLES (~10 tables)

**Django Built-in:**
- `auth_user` - Django auth users (backup)
- `auth_group` - User groups
- `auth_permission` - Permissions
- `auth_group_permissions` - Group permissions
- `django_content_type` - Content types
- `django_session` - Sessions
- `django_migrations` - Migration history
- `django_admin_log` - Admin log

---

## Quick Table Count by Module

| Module | Count |
|--------|-------|
| Accounts | 25 |
| Profiles | 8 |
| Core | 20 |
| Messaging | 5 |
| Matching | 8 |
| Django | 10 |
| Other | 5 |
| **TOTAL** | **~80+** |

---

## Key Tables You'll Use Most

### For Member Management
- `accounts_member` - Main member table
- `accounts_memberprofile` - Extended profile
- `profiles_profilephoto` - Photos

### For Verification
- `core_profileverificationrequest` - Verification queue
- `accounts_authchallenge` - OTP storage

### For Matching
- `core_shortlist` - Saved profiles
- `core_interest` - Interest exchanges
- `matching_compatibilitycheck` - Compatibility

### For Payments
- `core_subscription` - Active subscriptions
- `core_transaction` - Payment history
- `core_membershipplan` - Available plans

---

## View All Tables Command

In pgAdmin:
1. Connect to `matiromony` database
2. Go to `Schemas` → `public` → `Tables`
3. You'll see all ~80+ tables listed

Or via SQL:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## Database Size

With ~80+ tables, the application supports:
- ✅ Member profiles with detailed information
- ✅ Photo storage and management
- ✅ Document verification
- ✅ Matching algorithm
- ✅ Message/Chat system
- ✅ Subscription management
- ✅ Admin tools and logging
- ✅ Search and filters
- ✅ Testimonials and success stories
- ✅ Comprehensive audit trails

---

**Total Database Tables: ~80+** 📊
