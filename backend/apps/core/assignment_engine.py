import logging
from django.utils import timezone
from django.db import transaction
from django.db.models import F
from apps.accounts.models import Staff, CustomerSupportAgent
from apps.core.models import (
    SupportTicket, ProfileVerificationRequest, TicketAssignment,
    TicketAssignmentHistory, ProfileVerificationAssignment, WorkAssignment,
    AssignmentRule, AssignmentAudit, Notification, Workload, Queue
)

logger = logging.getLogger(__name__)

def auto_assign_ticket(ticket: SupportTicket) -> bool:
    """
    Automatically routes and assigns a SupportTicket to the best available CS Agent
    based on active AssignmentRules.
    """
    try:
        # Find active rules matching this category
        rules = AssignmentRule.objects.filter(
            category=ticket.category,
            is_active=True
        ).order_by('-priority_order', 'created_at')

        if ticket.priority:
            priority_rules = rules.filter(priority=ticket.priority)
            if priority_rules.exists():
                rules = priority_rules

        rule = rules.first()
        if not rule:
            logger.info(f"No active assignment rule found for ticket {ticket.ticket_number} (category: {ticket.category.code}). Routing to UNASSIGNED.")
            unassigned_queue = Queue.objects.filter(code='UNASSIGNED').first()
            ticket.status = SupportTicket.Status.UNASSIGNED
            ticket.save()
            
            AssignmentAudit.objects.create(
                related_object_id=ticket.id,
                related_object_type='TICKET',
                strategy_applied='NONE',
                success=False,
                failure_reason=f"No matching AssignmentRule for category: {ticket.category.code}"
            )
            return False

        # Find eligible agents
        agents = CustomerSupportAgent.objects.filter(
            is_active=True,
            deleted_at__isnull=True,
            availability__is_suspended=False,
            availability__availability_status='AVAILABLE'
        )

        if rule.department:
            agents = agents.filter(department=rule.department)
        if rule.designation:
            agents = agents.filter(designation=rule.designation)

        # Specialization matching: filter by agents having the specialization matching the category code
        specialized_agents = agents.filter(specializations__code=ticket.category.code)
        if specialized_agents.exists():
            agents = specialized_agents
        else:
            general_agents = agents.filter(specializations__code='GENERAL')
            if general_agents.exists():
                agents = general_agents

        # Filter out agents exceeding capacity
        agents = agents.filter(workload__open_tickets_count__lt=F('workload__capacity'))

        if not agents.exists():
            ticket.status = SupportTicket.Status.UNASSIGNED
            ticket.save()

            AssignmentAudit.objects.create(
                related_object_id=ticket.id,
                related_object_type='TICKET',
                rule_applied=rule,
                strategy_applied=rule.strategy.code,
                success=False,
                failure_reason="No eligible agents found within capacity"
            )
            return False

        strategy_code = rule.strategy.code
        selected_agent = None

        if strategy_code == 'ROUND_ROBIN':
            selected_agent = agents.order_by(F('workload__last_assigned_at').asc(nulls_first=True)).first()
        elif strategy_code == 'LEAST_WORKLOAD':
            selected_agent = agents.order_by('workload__open_tickets_count').first()
        elif strategy_code == 'SLA_AVAILABILITY':
            selected_agent = agents.order_by('workload__avg_resolution_time_minutes', 'workload__open_tickets_count').first()
        else:
            selected_agent = agents.order_by(F('workload__last_assigned_at').asc(nulls_first=True)).first()

        if not selected_agent:
            return False

        with transaction.atomic():
            ticket.current_assignee = selected_agent
            ticket.status = SupportTicket.Status.ASSIGNED
            ticket.save()

            TicketAssignment.objects.filter(ticket=ticket, is_current=True).update(is_current=False)
            TicketAssignment.objects.create(
                ticket=ticket,
                assigned_to_support_agent=selected_agent,
                claimed_by_support_agent=selected_agent,
                assignment_reason=f"Automatically assigned by rule: {rule.name}"
            )

            TicketAssignmentHistory.objects.create(
                ticket=ticket,
                employee=selected_agent,
                notes=f"Auto-assigned using {strategy_code} strategy."
            )

            workload = selected_agent.workload
            workload.open_tickets_count += 1
            if ticket.priority == SupportTicket.Priority.URGENT:
                workload.urgent_tickets_count += 1
            workload.last_assigned_at = timezone.now()
            workload.current_workload_score = workload.open_tickets_count + workload.urgent_tickets_count * 2
            workload.save()

            AssignmentAudit.objects.create(
                related_object_id=ticket.id,
                related_object_type='TICKET',
                rule_applied=rule,
                strategy_applied=strategy_code,
                assigned_agent=selected_agent,
                success=True
            )

            Notification.objects.create(
                support_recipient=selected_agent,
                notification_type='TICKET_ASSIGNMENT',
                title='New Ticket Assigned Automatically',
                message=f"Ticket {ticket.ticket_number} (Category: {ticket.category.name}) has been auto-assigned to you.",
                priority=Notification.Priority.HIGH if ticket.priority == SupportTicket.Priority.URGENT else Notification.Priority.NORMAL
            )

        logger.info(f"Successfully auto-assigned ticket {ticket.ticket_number} to agent {selected_agent.email}.")
        return True
    except Exception as e:
        logger.exception(f"Error during auto-assignment of ticket {ticket.id}: {str(e)}")
        return False


def auto_assign_verification(verification: ProfileVerificationRequest) -> bool:
    """
    Automatically routes and assigns a ProfileVerificationRequest to the best available Staff member
    based on active AssignmentRules.
    """
    try:
        rules = AssignmentRule.objects.filter(
            verification_type=verification.verification_type,
            is_active=True
        ).order_by('-priority_order', 'created_at')

        rule = rules.first()
        if not rule:
            logger.info(f"No active assignment rule found for verification request {verification.id} (type: {verification.verification_type}).")
            
            AssignmentAudit.objects.create(
                related_object_id=verification.id,
                related_object_type='VERIFICATION',
                strategy_applied='NONE',
                success=False,
                failure_reason=f"No matching AssignmentRule for verification type: {verification.verification_type}"
            )
            return False

        staff_members = Staff.objects.filter(
            is_active=True,
            deleted_at__isnull=True,
            availability__is_suspended=False,
            availability__availability_status='AVAILABLE'
        )

        if rule.department:
            staff_members = staff_members.filter(department=rule.department)
        if rule.designation:
            staff_members = staff_members.filter(designation=rule.designation)

        staff_members = staff_members.filter(workload__open_verifications_count__lt=F('workload__capacity'))

        if not staff_members.exists():
            AssignmentAudit.objects.create(
                related_object_id=verification.id,
                related_object_type='VERIFICATION',
                rule_applied=rule,
                strategy_applied=rule.strategy.code,
                success=False,
                failure_reason="No eligible staff members found within capacity"
            )
            return False

        strategy_code = rule.strategy.code
        selected_staff = None

        if strategy_code == 'ROUND_ROBIN':
            selected_staff = staff_members.order_by(F('workload__last_assigned_at').asc(nulls_first=True)).first()
        elif strategy_code == 'LEAST_WORKLOAD':
            selected_staff = staff_members.order_by('workload__open_verifications_count').first()
        else:
            selected_staff = staff_members.order_by(F('workload__last_assigned_at').asc(nulls_first=True)).first()

        if not selected_staff:
            return False

        with transaction.atomic():
            verification.status = ProfileVerificationRequest.Status.ASSIGNED
            verification.save()

            ProfileVerificationAssignment.objects.filter(verification_request=verification, is_current=True).update(is_current=False)
            ProfileVerificationAssignment.objects.create(
                verification_request=verification,
                assigned_to_staff=selected_staff,
                is_current=True
            )

            assignment_type = 'PROFILE_VERIFICATION'
            if verification.verification_type == 'PROFILE_PHOTO':
                assignment_type = 'PHOTO_VERIFICATION'
            elif verification.verification_type == 'IDENTITY_DOCUMENT':
                assignment_type = 'DOCUMENT_VERIFICATION'

            WorkAssignment.objects.filter(related_profile_verification=verification).delete()
            WorkAssignment.objects.create(
                assignment_type=assignment_type,
                assigned_to_staff=selected_staff,
                related_profile_verification=verification,
                priority=verification.priority,
                status='ASSIGNED',
                due_at=timezone.now() + timezone.timedelta(days=1),
                notes=f"Auto-assigned using {strategy_code} strategy."
            )

            workload = selected_staff.workload
            workload.open_verifications_count += 1
            workload.last_assigned_at = timezone.now()
            workload.current_workload_score = workload.open_verifications_count + workload.open_tickets_count
            workload.save()

            AssignmentAudit.objects.create(
                related_object_id=verification.id,
                related_object_type='VERIFICATION',
                rule_applied=rule,
                strategy_applied=strategy_code,
                assigned_staff=selected_staff,
                success=True
            )

            Notification.objects.create(
                staff_recipient=selected_staff,
                notification_type='VERIFICATION_ASSIGNMENT',
                title='New Verification Task Assigned',
                message=f"Verification Request {verification.id} ({verification.get_verification_type_display()}) has been auto-assigned to you.",
                priority=Notification.Priority.NORMAL
            )

        logger.info(f"Successfully auto-assigned verification request {verification.id} to staff {selected_staff.email}.")
        return True
    except Exception as e:
        logger.exception(f"Error during auto-assignment of verification {verification.id}: {str(e)}")
        return False
