from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Member, MemberProfile


DEMO_MEMBERS = (
    {
        "email": "ananya.demo@example.com",
        "mobile_number": "9000000001",
        "first_name": "Ananya",
        "last_name": "Iyer",
        "gender": "Female",
        "date_of_birth": date(1997, 5, 12),
        "profile": {
            "marital_status": "NEVER_MARRIED",
            "religion": "Hindu",
            "mother_tongue": "Tamil",
            "caste": "Iyer",
            "highest_education": "M.Tech",
            "occupation": "Software Engineer",
            "annual_income": "18 LPA",
            "work_location": "Bengaluru",
            "about": "Enjoys travel, music, and long walks.",
            "hobbies": ["Travel", "Music", "Reading"],
        },
    },
    {
        "email": "arjun.demo@example.com",
        "mobile_number": "9000000002",
        "first_name": "Arjun",
        "last_name": "Menon",
        "gender": "Male",
        "date_of_birth": date(1994, 9, 23),
        "profile": {
            "marital_status": "NEVER_MARRIED",
            "religion": "Hindu",
            "mother_tongue": "Malayalam",
            "caste": "Menon",
            "highest_education": "MBA",
            "occupation": "Product Manager",
            "annual_income": "24 LPA",
            "work_location": "Bengaluru",
            "about": "Food enthusiast and weekend cyclist.",
            "hobbies": ["Cycling", "Cooking", "Photography"],
        },
    },
    {
        "email": "meera.demo@example.com",
        "mobile_number": "9000000003",
        "first_name": "Meera",
        "last_name": "Nair",
        "gender": "Female",
        "date_of_birth": date(1996, 2, 4),
        "profile": {
            "marital_status": "NEVER_MARRIED",
            "religion": "Hindu",
            "mother_tongue": "Malayalam",
            "caste": "Nair",
            "highest_education": "B.Des",
            "occupation": "Designer",
            "annual_income": "15 LPA",
            "work_location": "Kochi",
            "about": "Creative professional with a fondness for books.",
            "hobbies": ["Design", "Books", "Yoga"],
        },
    },
)


class Command(BaseCommand):
    help = "Create idempotent demo members and profile data for local testing."

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        for data in DEMO_MEMBERS:
            profile_data = data["profile"]
            member_defaults = {
                key: value
                for key, value in data.items()
                if key not in {"email", "profile"}
            }
            member, was_created = Member.objects.get_or_create(
                email=data["email"],
                defaults={
                    **member_defaults,
                    "is_email_verified": True,
                    "is_mobile_verified": True,
                    "profile_status": Member.ProfileStatus.APPROVED,
                    "is_seed_data": True,
                },
            )
            if was_created:
                member.set_password("DemoPass123!")
                member.save(update_fields=("password", "updated_at"))
                created += 1
            profile, _ = MemberProfile.objects.get_or_create(member=member)
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.compatibility = max(profile.compatibility, 75)
            profile.save()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed data ready ({created} new members; password: DemoPass123!)."
            )
        )
