from apps.accounts.models import CustomerSupportAgent, RoleCode

from ._account_command import CreateAccountCommand


class Command(CreateAccountCommand):
    help = 'Create an agent in the separate customer_support_agents table.'
    model = CustomerSupportAgent
    role_code = RoleCode.CUSTOMER_SUPPORT
    account_label = 'Customer Support agent'

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument('--employee-code')
        parser.add_argument('--support-level', choices=('L1', 'L2', 'L3'), default='L1')
        parser.add_argument(
            '--specialization',
            choices=('GENERAL', 'PAYMENTS', 'PROFILE_VERIFICATION', 'TECHNICAL', 'REFUNDS', 'SAFETY'),
            default='GENERAL',
        )

    def extra_values(self, options):
        employee_code = self.value(options, 'employee_code', 'Employee code')
        if not employee_code:
            raise ValueError('Employee code is required.')
        
        dept_name = 'Customer Support'
        desig_name = 'Support Agent'
        from apps.accounts.models import Department, Designation
        dept, _ = Department.objects.get_or_create(
            code=dept_name.lower().replace(' ', '_'),
            defaults={'name': dept_name}
        )
        desig, _ = Designation.objects.get_or_create(
            department=dept,
            code=desig_name.lower().replace(' ', '_'),
            defaults={'name': desig_name}
        )
        return {
            'employee_code': employee_code,
            'support_level': options['support_level'],
            'specialization': options['specialization'],
            'department': dept,
            'designation': desig,
        }
