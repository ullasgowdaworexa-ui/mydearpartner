from django.core.management.base import BaseCommand
from apps.core.models import MembershipPlan


class Command(BaseCommand):
    help = 'Idempotently seeds default membership plans with correct limits and features.'

    def handle(self, *args, **options):
        plans_data = [
            {
                'slug': 'free',
                'name': 'Free',
                'price': 0.00,
                'duration': '30 Days',
                'duration_days': 30,
                'is_active': True,
                'is_featured': False,
                'display_order': 1,
                'profile_view_limit_daily': 10,
                'interest_limit_daily': 3,
                'message_limit_daily': 0,
                'can_message': False,
                'contact_access_mode': 'NONE',
                'photo_access_mode': 'PRIMARY_ONLY',
                'can_use_advanced_search': False,
                'can_use_horoscope': False,
                'profile_boost_level': 'NONE',
                'support_priority': 'STANDARD',
                'description': 'Basic search and matching with limitations',
                'color': 'from-gray-400 to-gray-600',
                'features': ['Basic profiles search', 'Send 3 interests daily', 'View primary photos only']
            },
            {
                'slug': 'gold',
                'name': 'Gold',
                'price': 2999.00,
                'duration': '3 Months',
                'duration_days': 90,
                'is_active': True,
                'is_featured': False,
                'display_order': 2,
                'profile_view_limit_daily': 50,
                'interest_limit_daily': 15,
                'message_limit_daily': 15,
                'can_message': True,
                'contact_access_mode': 'MUTUAL_ONLY',
                'photo_access_mode': 'ALL_APPROVED',
                'can_use_advanced_search': True,
                'can_use_horoscope': True,
                'profile_boost_level': 'NONE',
                'support_priority': 'STANDARD',
                'description': 'For active seekers who want priority connections',
                'color': 'from-amber-400 to-amber-600',
                'features': ['Send 15 interests daily', 'Messaging allowed on accepted interest', 'Mutual contact details access', 'View all approved photos', 'Advanced filter searches']
            },
            {
                'slug': 'platinum',
                'name': 'Platinum',
                'price': 5999.00,
                'duration': '6 Months',
                'duration_days': 180,
                'is_active': True,
                'is_featured': True,
                'display_order': 3,
                'profile_view_limit_daily': 200,
                'interest_limit_daily': 50,
                'message_limit_daily': 50,
                'can_message': True,
                'contact_access_mode': 'FULL',
                'photo_access_mode': 'ALL_APPROVED',
                'can_use_advanced_search': True,
                'can_use_horoscope': True,
                'profile_boost_level': 'MEDIUM',
                'support_priority': 'STANDARD',
                'description': 'Our most popular plan for faster premium matchmaking',
                'color': 'from-cyan-500 to-blue-600',
                'features': ['Send 50 interests daily', 'Unrestricted direct messaging', 'Unrestricted contact details access', 'Medium profile visibility boost', 'Advanced filters & horoscope match']
            },
            {
                'slug': 'elite',
                'name': 'Elite',
                'price': 14999.00,
                'duration': '12 Months',
                'duration_days': 360,
                'is_active': True,
                'is_featured': False,
                'display_order': 4,
                'profile_view_limit_daily': 999,
                'interest_limit_daily': 999,
                'message_limit_daily': 999,
                'can_message': True,
                'contact_access_mode': 'FULL',
                'photo_access_mode': 'ALL_APPROVED',
                'can_use_advanced_search': True,
                'can_use_horoscope': True,
                'profile_boost_level': 'STRONG',
                'support_priority': 'HIGH',
                'description': 'The ultimate matrimonial package with VIP concierge services',
                'color': 'from-purple-600 to-indigo-800',
                'features': ['Unlimited profile views & interests', 'Unlimited messaging & contacts', 'Strongest profile visibility boost', 'Priority support services', 'Assisted personal matchmaking']
            }
        ]

        for p_data in plans_data:
            slug = p_data.pop('slug')
            plan, created = MembershipPlan.objects.update_or_create(
                slug=slug,
                defaults=p_data
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'{action} membership plan: {plan.name}'))
