"""
Management command: seed_development_members

Creates 40 realistic development-only members with complete profiles,
synthetic avatar photos, and membership plan assignments.

Safety:
    - Refuses to run when DEBUG=False
    - Refuses to run when ALLOW_DEVELOPMENT_SEED is not True
    - Never deletes non-seed data
    - All seeded members are flagged with is_seed_data=True

Usage:
    python manage.py seed_development_members
    python manage.py seed_development_members --count=40
    python manage.py seed_development_members --clear-existing
    python manage.py seed_development_members --approved-count=20 --pending-count=10 --rejected-count=5 --draft-count=5
"""

import io
import os
import random
import uuid
from datetime import date, timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
# Realistic data pools
# ─────────────────────────────────────────────────────────────────────────────

MALE_FIRST_NAMES = [
    'Arjun', 'Rahul', 'Vikram', 'Siddharth', 'Karthik', 'Aditya', 'Rohan',
    'Nikhil', 'Pranav', 'Deepak', 'Rajesh', 'Suresh', 'Manoj', 'Vivek',
    'Harish', 'Ajay', 'Anand', 'Pradeep', 'Sandeep', 'Varun',
]

FEMALE_FIRST_NAMES = [
    'Priya', 'Sneha', 'Ananya', 'Kavya', 'Divya', 'Pooja', 'Meera',
    'Nisha', 'Asha', 'Shreya', 'Lakshmi', 'Sunita', 'Rekha', 'Geeta',
    'Radha', 'Rani', 'Sujatha', 'Bhavana', 'Swathi', 'Deepa',
]

LAST_NAMES = [
    'Kumar', 'Sharma', 'Patel', 'Reddy', 'Nair', 'Pillai', 'Mehta',
    'Singh', 'Rao', 'Iyer', 'Agarwal', 'Joshi', 'Verma', 'Gupta',
    'Menon', 'Krishnan', 'Bose', 'Chatterjee', 'Das', 'Mishra',
]

RELIGIONS = [
    'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain',
]

MOTHER_TONGUES = [
    'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Hindi', 'Bengali',
    'Marathi', 'Gujarati', 'Punjabi', 'Odia',
]

CASTES = [
    'Brahmin', 'Kshatriya', 'Vaishya', 'Nair', 'Pillai', 'Nadar',
    'Reddy', 'Kamma', 'Kapu', 'Lingayat', 'Vokkaliga', 'No preference',
]

OCCUPATIONS = [
    'Software Engineer', 'Doctor', 'Teacher', 'Business Owner',
    'Chartered Accountant', 'Lawyer', 'Government Employee',
    'Bank Employee', 'Nurse', 'Architect', 'Civil Engineer',
    'Marketing Manager', 'HR Manager', 'Data Analyst', 'Designer',
]

EDUCATIONS = [
    'B.E. / B.Tech', 'M.E. / M.Tech', 'MBBS', 'MD / MS', 'BCA', 'MCA',
    'B.Com', 'M.Com', 'MBA', 'B.Sc', 'M.Sc', 'B.A', 'M.A', 'Ph.D',
    'LLB', 'B.Arch',
]

LOCATIONS = [
    'Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi',
    'Coimbatore', 'Madurai', 'Visakhapatnam', 'Nagpur', 'Surat',
]

ANNUAL_INCOMES = [
    '2-4 Lakhs', '4-6 Lakhs', '6-10 Lakhs', '10-15 Lakhs',
    '15-20 Lakhs', '20-30 Lakhs', '30-50 Lakhs', '50+ Lakhs',
]

HEIGHTS = [
    "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"",
    "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\"",
]

MARITAL_STATUSES = ['Never Married', 'Divorced', 'Widowed', 'Separated']

FAMILY_TYPES = ['Nuclear', 'Joint', 'Extended']

HOBBIES_POOL = [
    'Reading', 'Cooking', 'Travelling', 'Music', 'Movies', 'Cricket',
    'Yoga', 'Painting', 'Photography', 'Gardening', 'Dancing', 'Chess',
    'Swimming', 'Badminton', 'Tennis', 'Cycling',
]

ABOUT_TEMPLATES = [
    "I am a passionate {occupation} based in {location}. I enjoy {hobby1} and {hobby2} in my free time. Looking for a life partner who values family and has a positive outlook on life.",
    "Simple and family-oriented person working as a {occupation}. I love {hobby1} and believe in a balance between career and personal life. Based in {location}.",
    "A {occupation} by profession, I am fun-loving and easy-going. My hobbies include {hobby1} and {hobby2}. I come from a close-knit family in {location}.",
    "Dedicated {occupation} looking for a compatible life partner. I enjoy {hobby1} on weekends. Family values are important to me. Currently living in {location}.",
]

FATHER_STATUSES = ['Employed', 'Retired', 'Business', 'Passed away']
MOTHER_STATUSES = ['Homemaker', 'Employed', 'Retired', 'Business', 'Passed away']

REJECTION_REASONS = [
    'Profile information appears to be incomplete or inconsistent. Please update your bio and family details.',
    'The uploaded profile photo does not meet our guidelines. Please upload a clear, recent face photo.',
    'Verification documents could not be verified. Please resubmit with valid, government-issued ID.',
]

# Membership plan distribution for approved members
PLAN_DISTRIBUTION = [
    ('free', 10),
    ('gold', 5),
    ('platinum', 3),
    ('elite', 2),
]


# ─────────────────────────────────────────────────────────────────────────────
# Avatar image generation using Pillow
# ─────────────────────────────────────────────────────────────────────────────

def _generate_avatar(gender: str, index: int) -> bytes:
    """
    Generate a simple synthetic avatar JPEG using Pillow.
    Returns JPEG bytes.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        raise CommandError(
            'Pillow is required to generate avatars. Install it with: pip install Pillow'
        )

    # Gender-based color palette
    if gender == 'Male':
        bg_colors = [
            (52, 152, 219), (41, 128, 185), (26, 82, 118),
            (31, 97, 141), (21, 67, 96), (93, 173, 226),
        ]
        text_colors = [(255, 255, 255)]
    else:
        bg_colors = [
            (231, 76, 60), (192, 57, 43), (169, 50, 38),
            (236, 112, 99), (203, 67, 53), (250, 128, 114),
        ]
        text_colors = [(255, 255, 255)]

    bg_color = bg_colors[index % len(bg_colors)]
    text_color = text_colors[0]

    # Profile photos are generated at the canonical portrait size so they pass
    # the same 600×750 minimum validation as real uploads.
    size = (1200, 1500)
    img = Image.new('RGB', size, color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw a circle as avatar silhouette
    padding = 180
    draw.ellipse(
        [padding, padding, size[0] - padding, size[1] - padding],
        fill=(255, 255, 255, 30),
        outline=(255, 255, 255, 80),
    )

    # Draw index number in the center as placeholder text
    label = str(index + 1)
    try:
        # Try to use a default font; fall back to bitmap default
        font = ImageFont.truetype('arial.ttf', 240)
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(
        ((size[0] - text_w) / 2, (size[1] - text_h) / 2),
        label,
        fill=text_color,
        font=font,
    )

    # Add a small gender icon marker
    icon = '♂' if gender == 'Male' else '♀'
    draw.text((size[0] - 60, 20), icon, fill=(255, 255, 255), font=font)

    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    return buffer.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# Main command
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = 'Seed 40 realistic development members. Only runs when DEBUG=True and ALLOW_DEVELOPMENT_SEED=True.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=40,
            help='Total number of members to seed (default: 40).',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            default=False,
            help='Delete all previously seeded members (is_seed_data=True) before seeding.',
        )
        parser.add_argument(
            '--approved-count',
            type=int,
            default=20,
            help='Number of APPROVED members (default: 20).',
        )
        parser.add_argument(
            '--pending-count',
            type=int,
            default=10,
            help='Number of PENDING members (default: 10).',
        )
        parser.add_argument(
            '--rejected-count',
            type=int,
            default=5,
            help='Number of REJECTED members (default: 5).',
        )
        parser.add_argument(
            '--draft-count',
            type=int,
            default=5,
            help='Number of DRAFT members (default: 5).',
        )

    def handle(self, *args, **options):
        # ── Safety guards ──────────────────────────────────────────────────
        if not settings.DEBUG:
            raise CommandError(
                'seed_development_members refuses to run with DEBUG=False. '
                'This command is strictly for development only.'
            )
        if not getattr(settings, 'ALLOW_DEVELOPMENT_SEED', False):
            raise CommandError(
                'Set ALLOW_DEVELOPMENT_SEED=True in your .env file to enable seeding. '
                'This guard prevents accidental seeding in shared/staging environments.'
            )

        # ── Import models here to avoid import-time circular issues ────────
        from django.contrib.auth.hashers import make_password
        from apps.accounts.models import Member, MemberProfile, MemberPreference
        from apps.core.models import (
            MemberMembership, MembershipPlan, ProfileVerificationRequest,
        )
        from apps.profiles.models import ProfilePhoto
        from apps.profiles.services.image_processing import ImageProcessingService

        count = options['count']
        approved_n = options['approved_count']
        pending_n = options['pending_count']
        rejected_n = options['rejected_count']
        draft_n = options['draft_count']
        clear = options['clear_existing']

        total = approved_n + pending_n + rejected_n + draft_n
        if total != count:
            self.stdout.write(self.style.WARNING(
                f'approved({approved_n}) + pending({pending_n}) + rejected({rejected_n}) + draft({draft_n}) '
                f'= {total}, not --count={count}. Using the sum ({total}) as actual count.'
            ))
            count = total

        password_raw = os.environ.get('DEV_MEMBER_PASSWORD', 'DevSeed@2026!')
        hashed_password = make_password(password_raw)

        # ── Optional clear ─────────────────────────────────────────────────
        if clear:
            existing = Member.objects.filter(is_seed_data=True)
            n = existing.count()
            existing.delete()
            self.stdout.write(self.style.WARNING(f'Cleared {n} existing seed members.'))

        # ── Determine how many already exist ──────────────────────────────
        already_count = Member.objects.filter(is_seed_data=True).count()
        if already_count >= count:
            self.stdout.write(self.style.SUCCESS(
                f'Already have {already_count} seed members (requested {count}). '
                f'Run with --clear-existing to reset.'
            ))
            return

        to_create = count - already_count
        self.stdout.write(f'Creating {to_create} seed members ({already_count} already exist)…')

        # ── Build member list ──────────────────────────────────────────────
        male_names = list(MALE_FIRST_NAMES)
        female_names = list(FEMALE_FIRST_NAMES)
        last_names = list(LAST_NAMES)
        random.shuffle(male_names)
        random.shuffle(female_names)
        random.shuffle(last_names)

        half = to_create // 2
        male_count = half
        female_count = to_create - half

        statuses = (
            [Member.ProfileStatus.APPROVED] * approved_n
            + [Member.ProfileStatus.PENDING] * pending_n
            + [Member.ProfileStatus.REJECTED] * rejected_n
            + [Member.ProfileStatus.DRAFT] * draft_n
        )
        random.shuffle(statuses)
        statuses = statuses[:to_create]

        genders = (
            [Member.Gender.MALE] * male_count
            + [Member.Gender.FEMALE] * female_count
        )
        random.shuffle(genders)

        today = date.today()

        created_members = []

        with transaction.atomic():
            for i in range(to_create):
                gender = genders[i]
                prof_status = statuses[i]
                idx = already_count + i  # unique index across runs

                # ── Identity ──────────────────────────────────────────────
                first_name = (
                    male_names[i % len(male_names)]
                    if gender == Member.Gender.MALE
                    else female_names[i % len(female_names)]
                )
                last_name = last_names[i % len(last_names)]

                email = f'member{idx + 1:03d}@example.test'
                mobile = f'+9199{(10000000 + idx):08d}'

                # Check for collision (idempotency)
                if Member.objects.filter(email=email).exists():
                    self.stdout.write(self.style.WARNING(f'  Skipping {email} (already exists).'))
                    continue

                dob = today - timedelta(days=365 * random.randint(21, 38) + random.randint(0, 364))

                # ── Create member ─────────────────────────────────────────
                photo_status = (
                    Member.ReviewStatus.APPROVED
                    if prof_status == Member.ProfileStatus.APPROVED
                    else (
                        Member.ReviewStatus.PENDING
                        if prof_status in (Member.ProfileStatus.PENDING, Member.ProfileStatus.DRAFT)
                        else Member.ReviewStatus.REJECTED
                    )
                )

                member = Member(
                    email=email,
                    password=hashed_password,
                    first_name=first_name,
                    last_name=last_name,
                    gender=gender,
                    date_of_birth=dob,
                    profile_created_by=Member.ProfileCreatedBy.SELF,
                    is_email_verified=(prof_status == Member.ProfileStatus.APPROVED),
                    is_mobile_verified=False,
                    is_active=True,
                    is_premium=(
                        random.random() < 0.25
                        if prof_status == Member.ProfileStatus.APPROVED
                        else False
                    ),
                    profile_status=prof_status,
                    photo_status=photo_status,
                    document_status=(
                        Member.ReviewStatus.NOT_SUBMITTED
                        if prof_status == Member.ProfileStatus.DRAFT
                        else Member.ReviewStatus.PENDING
                    ),
                    mobile_number=mobile,
                    is_seed_data=True,
                )
                member.save()

                # ── Create full profile ───────────────────────────────────
                occupation = random.choice(OCCUPATIONS)
                location = random.choice(LOCATIONS)
                hobby1, hobby2 = random.sample(HOBBIES_POOL, 2)
                about_template = random.choice(ABOUT_TEMPLATES)
                about = about_template.format(
                    occupation=occupation, location=location, hobby1=hobby1, hobby2=hobby2
                )

                MemberProfile.objects.create(
                    member=member,
                    marital_status=random.choice(MARITAL_STATUSES),
                    height=random.choice(HEIGHTS),
                    weight=f'{random.randint(45, 95)} kg',
                    blood_group=random.choice(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-']),
                    complexion=random.choice(['Fair', 'Wheatish', 'Dark']),
                    religion=random.choice(RELIGIONS),
                    mother_tongue=random.choice(MOTHER_TONGUES),
                    caste=random.choice(CASTES),
                    sub_caste='',
                    highest_education=random.choice(EDUCATIONS),
                    occupation=occupation,
                    employed_in=random.choice(['Private', 'Government', 'Business', 'Self-employed']),
                    company=f'{random.choice(["TCS", "Infosys", "Wipro", "HCL", "Cognizant", "Accenture", "ISRO", "DRDO", "State Bank", "LIC"])} Ltd.',
                    annual_income=random.choice(ANNUAL_INCOMES),
                    work_location=location,
                    father_status=random.choice(FATHER_STATUSES),
                    mother_status=random.choice(MOTHER_STATUSES),
                    num_brothers=random.randint(0, 3),
                    num_sisters=random.randint(0, 3),
                    family_type=random.choice(FAMILY_TYPES),
                    family_status=random.choice(['Middle Class', 'Upper Middle Class', 'Affluent']),
                    family_location=random.choice(LOCATIONS),
                    about=about,
                    hobbies=[hobby1, hobby2] + random.sample(HOBBIES_POOL, random.randint(0, 2)),
                    compatibility=random.randint(40, 95),
                    submitted_at=(
                        timezone.now() - timedelta(days=random.randint(1, 90))
                        if prof_status != Member.ProfileStatus.DRAFT
                        else None
                    ),
                    rejection_reason=(
                        random.choice(REJECTION_REASONS)
                        if prof_status == Member.ProfileStatus.REJECTED
                        else ''
                    ),
                )

                # ── Create member preferences ─────────────────────────────
                MemberPreference.objects.create(
                    member=member,
                    preferred_age_min=random.randint(20, 28),
                    preferred_age_max=random.randint(30, 40),
                    preferred_religion=random.choice(['', random.choice(RELIGIONS)]),
                    preferred_location=random.choice(['', random.choice(LOCATIONS)]),
                )

                # ── Generate and save avatar image ────────────────────────
                avatar_bytes = _generate_avatar(gender, idx)
                filename = f'seed_{uuid.uuid4().hex[:12]}.jpg'
                image_content = ContentFile(avatar_bytes, name=filename)

                processed_avatar = ImageProcessingService.process_profile_photo(image_content)
                avatar_status = (
                    ProfilePhoto.Status.APPROVED
                    if photo_status == Member.ReviewStatus.APPROVED
                    else (
                        ProfilePhoto.Status.REJECTED
                        if photo_status == Member.ReviewStatus.REJECTED
                        else ProfilePhoto.Status.PENDING
                    )
                )
                ProfilePhoto.objects.create(
                    user=member,
                    image_data=processed_avatar.image_bytes,
                    thumbnail_data=processed_avatar.thumbnail_bytes,
                    mime_type=processed_avatar.mime_type,
                    original_filename=filename,
                    original_size_bytes=processed_avatar.original_size_bytes,
                    compressed_size_bytes=processed_avatar.compressed_size_bytes,
                    thumbnail_size_bytes=processed_avatar.thumbnail_size_bytes,
                    width=processed_avatar.width,
                    height=processed_avatar.height,
                    thumbnail_width=processed_avatar.thumbnail_width,
                    thumbnail_height=processed_avatar.thumbnail_height,
                    checksum=processed_avatar.checksum,
                    is_primary=True,
                    status=avatar_status,
                    display_order=0,
                    verified_at=timezone.now() if avatar_status != ProfilePhoto.Status.PENDING else None,
                )

                # ── ProfileVerificationRequest ────────────────────────────
                if prof_status != Member.ProfileStatus.DRAFT:
                    pvr_status_map = {
                        Member.ProfileStatus.APPROVED: ProfileVerificationRequest.Status.APPROVED,
                        Member.ProfileStatus.PENDING: ProfileVerificationRequest.Status.PENDING,
                        Member.ProfileStatus.REJECTED: ProfileVerificationRequest.Status.REJECTED,
                    }
                    pvr = ProfileVerificationRequest.objects.create(
                        member=member,
                        verification_type=ProfileVerificationRequest.VerificationType.FULL_PROFILE,
                        status=pvr_status_map[prof_status],
                        priority=random.choice([
                            ProfileVerificationRequest.Priority.NORMAL,
                            ProfileVerificationRequest.Priority.HIGH,
                        ]),
                        submitted_at=timezone.now() - timedelta(days=random.randint(1, 60)),
                        approved_at=(
                            timezone.now() - timedelta(days=random.randint(1, 30))
                            if prof_status == Member.ProfileStatus.APPROVED
                            else None
                        ),
                        rejected_at=(
                            timezone.now() - timedelta(days=random.randint(1, 30))
                            if prof_status == Member.ProfileStatus.REJECTED
                            else None
                        ),
                        rejection_reason=(
                            random.choice(REJECTION_REASONS)
                            if prof_status == Member.ProfileStatus.REJECTED
                            else ''
                        ),
                    )
                    _ = pvr  # available for further FK linking if needed

                created_members.append(member)
                self.stdout.write(f'  [{prof_status:8s}] {member.email} ({gender})')

            # ── Assign membership plans to approved members ────────────────
            approved_members = [
                m for m in created_members
                if m.profile_status == Member.ProfileStatus.APPROVED
            ]
            random.shuffle(approved_members)

            plan_queue = []
            for slug, n in PLAN_DISTRIBUTION:
                plan_queue.extend([slug] * n)

            for member in approved_members:
                if not plan_queue:
                    break
                plan_slug = plan_queue.pop(0)
                if plan_slug == 'free':
                    # FREE plan: create membership with no plan (null plan = free tier)
                    MemberMembership.objects.get_or_create(
                        member=member,
                        defaults={'plan': None, 'is_active': True},
                    )
                    continue
                try:
                    plan = MembershipPlan.objects.get(slug=plan_slug)
                except MembershipPlan.DoesNotExist:
                    self.stdout.write(self.style.WARNING(
                        f'  Plan "{plan_slug}" not found. Run baseline seeding first. Skipping.'
                    ))
                    continue
                end_date = {
                    'gold': timezone.now() + timedelta(days=90),
                    'platinum': timezone.now() + timedelta(days=180),
                    'elite': timezone.now() + timedelta(days=365),
                }.get(plan_slug)
                MemberMembership.objects.update_or_create(
                    member=member,
                    defaults={
                        'plan': plan,
                        'is_active': True,
                        'start_date': timezone.now() - timedelta(days=random.randint(1, 30)),
                        'end_date': end_date,
                    },
                )
                # Mark member as premium if GOLD+
                member.is_premium = True
                member.save(update_fields=['is_premium'])

        total_created = len(created_members)
        self.stdout.write(self.style.SUCCESS(
            f'\n[OK] Successfully seeded {total_created} development members.\n'
            f'  Password for all: {password_raw}\n'
            f'  Email pattern: member001@example.test ... member{count:03d}@example.test\n\n'
            f'  Profile status distribution:\n'
            f'    APPROVED : {sum(1 for m in created_members if m.profile_status == "APPROVED")}\n'
            f'    PENDING  : {sum(1 for m in created_members if m.profile_status == "PENDING")}\n'
            f'    REJECTED : {sum(1 for m in created_members if m.profile_status == "REJECTED")}\n'
            f'    DRAFT    : {sum(1 for m in created_members if m.profile_status == "DRAFT")}\n'
        ))
