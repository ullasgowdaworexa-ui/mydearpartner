from apps.accounts.models import RoleCode, Staff

from ._account_command import CreateAccountCommand


class Command(CreateAccountCommand):
    help = 'Create a Staff account in the separate staff table.'
    model = Staff
    role_code = RoleCode.STAFF
    account_label = 'Staff'

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument('--department')
        parser.add_argument('--designation')

    def extra_values(self, options):
        dept_name = self.value(options, 'department', 'Department') or 'Operations'
        desig_name = self.value(options, 'designation', 'Designation') or 'Staff'
        
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
            'department': dept,
            'designation': desig,
            'employee_code': f'STF-{Staff.objects.count() + 1:05d}',
        }
