import pytest
from apps.accounts.models import CustomerSupportAgent, Staff, AdminRole, RoleCode
from apps.core.models import (
    SupportTicket,
    ProfileVerificationRequest,
    SupportCategory,
    AssignmentStrategy,
    AssignmentRule,
    Specialization,
    Queue,
    EmployeeAvailability,
    Workload,
    AssignmentAudit,
)
from apps.core.assignment_engine import auto_assign_ticket, auto_assign_verification

PASSWORD = 'TestPassword!742'

@pytest.fixture
def test_setup(db, admin_account):
    # Setup strategies
    least_workload_strat, _ = AssignmentStrategy.objects.get_or_create(
        code='LEAST_WORKLOAD',
        defaults={'name': 'Least Workload'}
    )
    round_robin_strat, _ = AssignmentStrategy.objects.get_or_create(
        code='ROUND_ROBIN',
        defaults={'name': 'Round Robin'}
    )

    # Setup categories
    category_general, _ = SupportCategory.objects.get_or_create(
        code='GENERAL',
        defaults={'name': 'General Inquiry', 'is_active': True}
    )
    category_billing, _ = SupportCategory.objects.get_or_create(
        code='BILLING',
        defaults={'name': 'Billing Inquiry', 'is_active': True}
    )

    # Setup queue
    unassigned_queue, _ = Queue.objects.get_or_create(
        code='UNASSIGNED',
        defaults={'name': 'Unassigned Queue'}
    )

    # Setup specialization
    spec_general, _ = Specialization.objects.get_or_create(
        code='GENERAL',
        defaults={'name': 'General Support'}
    )
    spec_billing, _ = Specialization.objects.get_or_create(
        code='BILLING',
        defaults={'name': 'Billing Support'}
    )
    spec_verification, _ = Specialization.objects.get_or_create(
        code='VERIFICATION',
        defaults={'name': 'Profile Verification'}
    )

    return {
        'least_workload_strat': least_workload_strat,
        'round_robin_strat': round_robin_strat,
        'category_general': category_general,
        'category_billing': category_billing,
        'unassigned_queue': unassigned_queue,
        'spec_general': spec_general,
        'spec_billing': spec_billing,
        'spec_verification': spec_verification,
    }


def test_workload_and_availability_creation(db, admin_account):
    # Create Staff
    staff = Staff.objects.create_user(
        email='new_staff@example.com',
        mobile_number='1234567890',
        password=PASSWORD,
        first_name='John',
        last_name='Staff',
        employee_code='STF-9999',
        role=AdminRole.objects.get(code=RoleCode.STAFF),
        created_by_admin=admin_account,
        is_email_verified=True,
    )
    assert hasattr(staff, 'availability')
    assert hasattr(staff, 'workload')
    assert staff.availability.is_online is True
    assert staff.workload.capacity == 10

    # Create CSAgent
    agent = CustomerSupportAgent.objects.create_user(
        email='new_agent@example.com',
        mobile_number='1234567891',
        password=PASSWORD,
        first_name='Jane',
        last_name='Agent',
        employee_code='CSA-9999',
        role=AdminRole.objects.get(code=RoleCode.CUSTOMER_SUPPORT),
        created_by_admin=admin_account,
        is_email_verified=True,
    )
    assert hasattr(agent, 'availability')
    assert hasattr(agent, 'workload')
    assert agent.availability.is_online is True


def test_auto_assign_ticket_least_workload(db, test_setup, admin_account, member):
    # Create rule
    rule = AssignmentRule.objects.create(
        name='General Least Workload Rule',
        category=test_setup['category_general'],
        strategy=test_setup['least_workload_strat'],
        is_active=True,
        priority_order=1
    )

    # Create two support agents
    agent1 = CustomerSupportAgent.objects.create_user(
        email='agent1@example.com',
        mobile_number='1111111111',
        password=PASSWORD,
        first_name='Agent',
        last_name='One',
        employee_code='CSA-1111',
        role=AdminRole.objects.get(code=RoleCode.CUSTOMER_SUPPORT),
        created_by_admin=admin_account,
        is_email_verified=True,
    )
    agent2 = CustomerSupportAgent.objects.create_user(
        email='agent2@example.com',
        mobile_number='2222222222',
        password=PASSWORD,
        first_name='Agent',
        last_name='Two',
        employee_code='CSA-2222',
        role=AdminRole.objects.get(code=RoleCode.CUSTOMER_SUPPORT),
        created_by_admin=admin_account,
        is_email_verified=True,
    )

    # Add specialization
    agent1.specializations.add(test_setup['spec_general'])
    agent2.specializations.add(test_setup['spec_general'])

    # Set workloads: agent1 has 3 open, agent2 has 1 open
    agent1.workload.open_tickets_count = 3
    agent1.workload.save()
    agent2.workload.open_tickets_count = 1
    agent2.workload.save()

    # Create support ticket
    ticket = SupportTicket.objects.create(
        member=member,
        category=test_setup['category_general'],
        subject='Least Workload Test',
        description='Test details',
        priority=SupportTicket.Priority.NORMAL,
    )

    # Trigger auto assign
    assigned = auto_assign_ticket(ticket)
    assert assigned is True
    ticket.refresh_from_db()
    assert ticket.current_assignee == agent2
    assert ticket.status == SupportTicket.Status.ASSIGNED


def test_auto_assign_ticket_round_robin(db, test_setup, admin_account, member):
    # Create rule
    rule = AssignmentRule.objects.create(
        name='General Round Robin Rule',
        category=test_setup['category_general'],
        strategy=test_setup['round_robin_strat'],
        is_active=True,
        priority_order=1
    )

    # Create two support agents
    agent1 = CustomerSupportAgent.objects.create_user(
        email='agent_rr1@example.com',
        mobile_number='3333333333',
        password=PASSWORD,
        first_name='Agent',
        last_name='RR1',
        employee_code='CSA-3333',
        role=AdminRole.objects.get(code=RoleCode.CUSTOMER_SUPPORT),
        created_by_admin=admin_account,
        is_email_verified=True,
    )
    agent2 = CustomerSupportAgent.objects.create_user(
        email='agent_rr2@example.com',
        mobile_number='4444444444',
        password=PASSWORD,
        first_name='Agent',
        last_name='RR2',
        employee_code='CSA-4444',
        role=AdminRole.objects.get(code=RoleCode.CUSTOMER_SUPPORT),
        created_by_admin=admin_account,
        is_email_verified=True,
    )

    # Add specialization
    agent1.specializations.add(test_setup['spec_general'])
    agent2.specializations.add(test_setup['spec_general'])

    # Set last_assigned_at to order round robin
    # Let agent1 be assigned earlier, so agent2 is assigned next
    import datetime
    from django.utils import timezone
    agent1.workload.last_assigned_at = timezone.now() - datetime.timedelta(hours=2)
    agent1.workload.save()
    agent2.workload.last_assigned_at = timezone.now() - datetime.timedelta(hours=3)
    agent2.workload.save()

    ticket = SupportTicket.objects.create(
        member=member,
        category=test_setup['category_general'],
        subject='Round Robin Test 1',
        description='Test details',
    )
    assert ticket.current_assignee == agent2



def test_auto_assign_fallback_unassigned(db, test_setup, member):
    # Create ticket with no rules setup
    ticket = SupportTicket.objects.create(
        member=member,
        category=test_setup['category_general'],
        subject='No Rule Test',
        description='Test details',
    )
    assigned = auto_assign_ticket(ticket)
    assert assigned is False
    ticket.refresh_from_db()
    assert ticket.status == SupportTicket.Status.UNASSIGNED
    assert AssignmentAudit.objects.filter(related_object_id=ticket.id, success=False).exists()
