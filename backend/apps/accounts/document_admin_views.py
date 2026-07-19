"""
Document Verification Admin Views

Complete enterprise-grade document verification workflow for Super Admin, Admin, and Staff.
Covers: approve, reject, request-changes, delete, download, history, audit, notifications.
"""

from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction, models
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings

from .models import MemberDocument, DocumentReviewHistory, Member, AccountType, SuperAdmin, Admin, Staff
from .permissions import IsAdmin, IsStaffAccount, IsSuperAdmin, IsAdministrativeUser, HasAdminPermission, IsMember
from .verification_service import AccountVerificationService
from .verification_events import VerificationEvents
from .services import decompress_document
from apps.core.api_utils import audit as _audit, create_notification, client_ip
from apps.core.responses import ApiResponse


def _get_reviewer(request):
    if request.user.account_type == AccountType.SUPER_ADMIN:
        return request.user, 'SUPER_ADMIN'
    elif request.user.account_type == AccountType.ADMIN:
        return request.user, 'ADMIN'
    elif request.user.account_type == AccountType.STAFF:
        return request.user, 'STAFF'
    return request.user, 'UNKNOWN'


def _create_review_history(document, old_status, new_status, reason, reviewer_notes, changed_by_id, changed_by_role, request):
    return DocumentReviewHistory.objects.create(
        document=document,
        member=document.member,
        old_status=old_status,
        new_status=new_status,
        reason=reason,
        reviewer_notes=reviewer_notes,
        changed_by_id=changed_by_id,
        changed_by_role=changed_by_role,
        ip_address=client_ip(request),
    )


def _update_member_document_status(member, status):
    member.document_status = status
    member.document_reviewed_at = timezone.now()
    member.save(update_fields=['document_status', 'document_reviewed_at', 'updated_at'])


def _log_audit(request, actor, action, document, old_status=None, new_status=None, reason=''):
    _audit(
        request, actor,
        action=action,
        module='documents',
        target_type='MEMBER_DOCUMENT',
        target_id=document.pk,
        description=f'Document {document.document_type} {action.lower()} for member {document.member_id}',
        old_data={'status': old_status} if old_status else {},
        new_data={'status': new_status, 'reason': reason} if new_status else {'reason': reason},
    )


def _notify_member(document, notification_type, title, message):
    try:
        create_notification(
            document.member,
            type=notification_type,
            title=title,
            body=message,
            related_object=document,
        )
    except Exception:
        pass


class AdminDocumentListView(APIView):
    """GET /api/admin/documents/ - List all member documents with filters"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.view'

    def get(self, request):
        from django.core.paginator import Paginator

        queryset = MemberDocument.objects.select_related('member').order_by('-uploaded_at')

        status_filter = request.query_params.get('status')
        doc_type = request.query_params.get('document_type')
        member_id = request.query_params.get('member_id')
        search = request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if doc_type:
            queryset = queryset.filter(document_type__iexact=doc_type)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if search:
            queryset = queryset.filter(
                models.Q(member__first_name__icontains=search) |
                models.Q(member__last_name__icontains=search) |
                models.Q(member__email__icontains=search)
            )

        page_size = int(request.query_params.get('page_size', 25))
        page_number = int(request.query_params.get('page', 1))
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page_number)

        items = []
        for doc in page_obj:
            items.append({
                'id': str(doc.id),
                'member_id': str(doc.member_id),
                'member_name': doc.member.get_full_name(),
                'member_email': doc.member.email,
                'document_type': doc.document_type,
                'document_number': doc.document_number,
                'status': doc.status,
                'version_number': doc.version_number,
                'file_name': doc.file_name,
                'file_size': doc.file_size,
                'file_content_type': doc.file_content_type,
                'uploaded_at': doc.uploaded_at.isoformat(),
                'reviewed_at': doc.reviewed_at.isoformat() if doc.reviewed_at else None,
                'reviewed_by_id': str(doc.reviewed_by_id) if doc.reviewed_by_id else None,
                'reviewer': doc.reviewed_by.get_full_name() if doc.reviewed_by else None,
                'rejection_reason': doc.rejection_reason,
                'changes_requested_reason': doc.changes_requested_reason,
            })

        return ApiResponse(success=True, data={
            'items': items,
            'pagination': {
                'page': page_obj.number,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_items': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
            }
        }, status=status.HTTP_200_OK)


class AdminDocumentDetailView(APIView):
    """GET /api/admin/documents/{id}/ - Get document details with review history"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.view'

    def get(self, request, document_id):
        try:
            doc = MemberDocument.objects.select_related('member').get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        review_history = DocumentReviewHistory.objects.filter(document=doc).order_by('-created_at')

        history_data = []
        for h in review_history:
            history_data.append({
                'id': str(h.id),
                'old_status': h.old_status,
                'new_status': h.new_status,
                'reason': h.reason,
                'reviewer_notes': h.reviewer_notes,
                'changed_by_id': str(h.changed_by_id) if h.changed_by_id else None,
                'changed_by_role': h.changed_by_role,
                'ip_address': h.ip_address,
                'created_at': h.created_at.isoformat(),
            })

        data = {
            'id': str(doc.id),
            'member': {
                'id': str(doc.member_id),
                'name': doc.member.get_full_name(),
                'email': doc.member.email,
            },
            'document_type': doc.document_type,
            'document_number': doc.document_number,
            'expiry_date': doc.expiry_date.isoformat() if doc.expiry_date else None,
            'status': doc.status,
            'version_number': doc.version_number,
            'is_archived': doc.is_archived,
            'is_image': doc.is_image,
            'is_pdf': doc.is_pdf,
            'file_name': doc.file_name,
            'file_content_type': doc.file_content_type,
            'file_size': doc.file_size,
            'rejection_reason': doc.rejection_reason,
            'changes_requested_reason': doc.changes_requested_reason,
            'reviewer_notes': doc.reviewer_notes,
            'uploaded_at': doc.uploaded_at.isoformat(),
            'uploaded_by_id': str(doc.uploaded_by_id) if doc.uploaded_by_id else None,
            'reviewed_at': doc.reviewed_at.isoformat() if doc.reviewed_at else None,
            'reviewed_by_id': str(doc.reviewed_by_id) if doc.reviewed_by_id else None,
            'reviewer_name': doc.reviewed_by.get_full_name() if doc.reviewed_by else None,
            'review_history': history_data,
        }

        _log_audit(request, request.user, 'VERIFICATION_DOCUMENT_VIEWED', doc)

        return ApiResponse(success=True, data=data, status=status.HTTP_200_OK)


class AdminDocumentApproveView(APIView):
    """POST /api/admin/documents/{id}/approve/ - Approve a document"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.approve'

    def post(self, request, document_id):
        try:
            doc = MemberDocument.objects.select_related('member').get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        if doc.status not in (MemberDocument.Status.PENDING, MemberDocument.Status.CHANGES_REQUESTED):
            return ApiResponse(
                success=False,
                message=f'Only pending or changes-requested documents can be approved. Current status: {doc.status}',
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = doc.status
        reason = request.data.get('reason', '').strip()
        reviewer_notes = request.data.get('reviewer_notes', '').strip()
        reviewer, role = _get_reviewer(request)

        with transaction.atomic():
            doc.status = MemberDocument.Status.APPROVED
            doc.reviewed_at = timezone.now()
            doc.reviewed_by_id = reviewer.pk
            doc.rejection_reason = ''
            doc.changes_requested_reason = ''
            if reason:
                doc.reviewer_notes = reason
            doc.save()

            _create_review_history(doc, old_status, doc.status, reason or 'Document approved', reviewer_notes, reviewer.pk, role, request)

            _update_member_document_status(doc.member, AccountVerificationService.STATUS_APPROVED)

            _log_audit(request, request.user, 'VERIFICATION_DOCUMENT_APPROVED', doc, old_status=old_status, new_status=doc.status, reason=reason)

            _notify_member(
                doc, 'document_approved',
                'Document Approved',
                f'Your {doc.document_type} has been approved successfully.',
            )

            VerificationEvents.publish_verification_approved(
                doc.member, 'document', request.user
            )
            VerificationEvents.publish_document_updated(
                doc.member, str(doc.id), 'approved', doc.status, request.user
            )

            return ApiResponse(
                success=True,
                message='Document approved successfully.',
                data={'document_id': str(doc.id), 'status': doc.status},
                status=status.HTTP_200_OK,
            )


class AdminDocumentRejectView(APIView):
    """POST /api/admin/documents/{id}/reject/ - Reject a document with reason"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.reject'

    def post(self, request, document_id):
        try:
            doc = MemberDocument.objects.select_related('member').get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        if doc.status not in (MemberDocument.Status.PENDING, MemberDocument.Status.CHANGES_REQUESTED):
            return ApiResponse(
                success=False,
                message=f'Only pending or changes-requested documents can be rejected. Current status: {doc.status}',
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '').strip()
        if not reason or len(reason) < 10:
            return ApiResponse(
                success=False,
                message='Rejection reason is required and must be at least 10 characters.',
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = doc.status
        reviewer_notes = request.data.get('reviewer_notes', '').strip()
        reviewer, role = _get_reviewer(request)

        with transaction.atomic():
            doc.status = MemberDocument.Status.REJECTED
            doc.reviewed_at = timezone.now()
            doc.reviewed_by_id = reviewer.pk
            doc.rejection_reason = reason
            doc.changes_requested_reason = ''
            if reviewer_notes:
                doc.reviewer_notes = reviewer_notes
            doc.save()

            _create_review_history(doc, old_status, doc.status, reason, reviewer_notes, reviewer.pk, role, request)

            _update_member_document_status(doc.member, AccountVerificationService.STATUS_REJECTED)
            doc.member.document_rejection_reason = reason
            doc.member.save(update_fields=['document_rejection_reason'])

            _log_audit(request, request.user, 'VERIFICATION_DOCUMENT_REJECTED', doc, old_status=old_status, new_status=doc.status, reason=reason)

            _notify_member(
                doc, 'document_rejected',
                'Document Rejected',
                f'Your {doc.document_type} was rejected. Reason: {reason}',
            )

            VerificationEvents.publish_verification_rejected(
                doc.member, 'document', reason, request.user
            )
            VerificationEvents.publish_document_updated(
                doc.member, str(doc.id), 'rejected', doc.status, request.user
            )

            return ApiResponse(
                success=True,
                message='Document rejected.',
                data={'document_id': str(doc.id), 'status': doc.status},
                status=status.HTTP_200_OK,
            )


class AdminDocumentRequestChangesView(APIView):
    """POST /api/admin/documents/{id}/request-changes/ - Request changes to a document"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.request_changes'

    def post(self, request, document_id):
        try:
            doc = MemberDocument.objects.select_related('member').get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        if doc.status not in (MemberDocument.Status.PENDING, MemberDocument.Status.CHANGES_REQUESTED):
            return ApiResponse(
                success=False,
                message=f'Only pending documents can have changes requested. Current status: {doc.status}',
                status=status.HTTP_400_BAD_REQUEST,
            )

        feedback = request.data.get('message', '').strip()
        if not feedback or len(feedback) < 10:
            return ApiResponse(
                success=False,
                message='Feedback message is required and must be at least 10 characters.',
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = doc.status
        reviewer_notes = request.data.get('reviewer_notes', '').strip()
        reviewer, role = _get_reviewer(request)

        with transaction.atomic():
            doc.status = MemberDocument.Status.CHANGES_REQUESTED
            doc.reviewed_at = timezone.now()
            doc.reviewed_by_id = reviewer.pk
            doc.changes_requested_reason = feedback
            if reviewer_notes:
                doc.reviewer_notes = reviewer_notes
            doc.save()

            _create_review_history(doc, old_status, doc.status, feedback, reviewer_notes, reviewer.pk, role, request)

            _update_member_document_status(doc.member, AccountVerificationService.STATUS_CHANGES_REQUESTED)
            doc.member.document_rejection_reason = feedback
            doc.member.save(update_fields=['document_rejection_reason'])

            _log_audit(request, request.user, 'VERIFICATION_DOCUMENT_CHANGES_REQUESTED', doc, old_status=old_status, new_status=doc.status, reason=feedback)

            _notify_member(
                doc, 'document_changes_requested',
                'Document Changes Requested',
                f'Changes requested for your {doc.document_type}. Feedback: {feedback}',
            )

            VerificationEvents.publish_verification_changes_requested(
                doc.member, 'document', feedback, request.user
            )
            VerificationEvents.publish_document_updated(
                doc.member, str(doc.id), 'changes_requested', doc.status, request.user
            )

            return ApiResponse(
                success=True,
                message='Changes requested successfully.',
                data={'document_id': str(doc.id), 'status': doc.status},
                status=status.HTTP_200_OK,
            )


class AdminDocumentDeleteView(APIView):
    """DELETE /api/admin/documents/{id}/delete/ - Soft delete a document"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.delete'

    def post(self, request, document_id):
        try:
            doc = MemberDocument.objects.get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        if doc.is_deleted:
            return ApiResponse(success=False, message='Document is already deleted.', status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '').strip()
        old_status = doc.status

        with transaction.atomic():
            doc.is_deleted = True
            doc.deleted_at = timezone.now()
            doc.deleted_by_id = request.user.pk
            doc.deletion_reason = reason or 'Deleted by admin'
            doc.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by_id', 'deletion_reason', 'updated_at'])

            _create_review_history(doc, old_status, 'DELETED', reason or 'Deleted by admin', '', request.user.pk, str(request.user.account_type), request)

            _log_audit(request, request.user, 'VERIFICATION_DOCUMENT_DELETED', doc, old_status=old_status, new_status='DELETED', reason=reason)

            VerificationEvents.publish_document_updated(
                doc.member, str(doc.id), 'deleted', 'DELETED', request.user
            )

            return ApiResponse(
                success=True,
                message='Document deleted successfully.',
                status=status.HTTP_200_OK,
            )


class AdminDocumentDownloadView(APIView):
    """GET /api/admin/documents/{id}/download/ - Secure document download with audit"""

    permission_classes = (permissions.IsAuthenticated, IsAdministrativeUser)

    def get(self, request, document_id):
        try:
            doc = MemberDocument.objects.get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        if doc.is_deleted:
            return ApiResponse(success=False, message='This document has been deleted.', status=status.HTTP_404_NOT_FOUND)

        # Check download permission
        has_perm = (
            request.user.account_type == AccountType.SUPER_ADMIN or
            request.user.has_admin_permission('documents.download') or
            request.user.has_admin_permission('documents.view')
        )
        if not has_perm:
            return ApiResponse(success=False, message='Access denied.', status=status.HTTP_403_FORBIDDEN)

        _log_audit(request, request.user, 'VERIFICATION_DOCUMENT_DOWNLOADED', doc)

        try:
            if doc.file_data:
                try:
                    raw = decompress_document(bytes(doc.file_data))
                except Exception:
                    return ApiResponse(
                        success=False, message='Document data is corrupted.',
                        code='DOCUMENT_CORRUPTED', status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                filename = doc.file_name or 'document'
                content_type = doc.file_content_type or 'application/octet-stream'
                response = HttpResponse(raw, content_type=content_type)
            elif doc.file_path:
                from pathlib import Path
                import mimetypes
                filename = Path(doc.file_path.name).name.replace('"', '')
                content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
                try:
                    from django.http import FileResponse
                    response = FileResponse(doc.file_path.open('rb'), content_type=content_type)
                except FileNotFoundError:
                    return ApiResponse(
                        success=False, message='Document file not found on server.',
                        code='DOCUMENT_FILE_MISSING', status=status.HTTP_404_NOT_FOUND,
                    )
            else:
                return ApiResponse(
                    success=False, message='Document has no file data.',
                    code='DOCUMENT_NO_DATA', status=status.HTTP_404_NOT_FOUND,
                )

            safe_filename = (filename or 'document').replace('"', '').replace('\\', '').replace('/', '')
            response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
            response['X-Content-Type-Options'] = 'nosniff'
            response['Cache-Control'] = 'private, no-cache, must-revalidate'
            return response

        except Exception:
            return ApiResponse(
                success=False, message='Error reading document.',
                code='DOCUMENT_READ_ERROR', status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminDocumentReviewHistoryView(APIView):
    """GET /api/admin/documents/{id}/history/ - Get full review history for a document"""

    permission_classes = (permissions.IsAuthenticated, HasAdminPermission)
    required_admin_permission = 'documents.review_history'

    def get(self, request, document_id):
        try:
            doc = MemberDocument.objects.get(pk=document_id)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        history = DocumentReviewHistory.objects.filter(document=doc).order_by('-created_at')

        data = []
        for h in history:
            data.append({
                'id': str(h.id),
                'old_status': h.old_status,
                'new_status': h.new_status,
                'reason': h.reason,
                'reviewer_notes': h.reviewer_notes,
                'changed_by_id': str(h.changed_by_id) if h.changed_by_id else None,
                'changed_by_role': h.changed_by_role,
                'created_at': h.created_at.isoformat(),
            })

        return ApiResponse(success=True, data={
            'document_id': str(doc.id),
            'document_type': doc.document_type,
            'current_status': doc.status,
            'history': data,
        }, status=status.HTTP_200_OK)


class AdminDocumentStatsView(APIView):
    """GET /api/admin/documents/stats/ - Dashboard stats for documents"""

    permission_classes = (permissions.IsAuthenticated, IsAdministrativeUser)

    def get(self, request):
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

        pending = MemberDocument.objects.filter(status=MemberDocument.Status.PENDING, is_deleted=False).count()
        approved_today = MemberDocument.objects.filter(
            status=MemberDocument.Status.APPROVED,
            reviewed_at__gte=today_start,
            is_deleted=False,
        ).count()
        rejected_today = MemberDocument.objects.filter(
            status=MemberDocument.Status.REJECTED,
            reviewed_at__gte=today_start,
            is_deleted=False,
        ).count()
        changes_requested = MemberDocument.objects.filter(
            status=MemberDocument.Status.CHANGES_REQUESTED,
            is_deleted=False,
        ).count()

        # Average review time (in hours) for documents reviewed today
        from django.db.models import Avg, F, ExpressionWrapper, DurationField
        avg_review = DocumentReviewHistory.objects.filter(
            created_at__gte=today_start,
            new_status__in=['APPROVED', 'REJECTED'],
        ).aggregate(
            avg_time=Avg(
                ExpressionWrapper(F('created_at') - F('document__uploaded_at'), output_field=DurationField())
            )
        )
        avg_hours = None
        if avg_review.get('avg_time'):
            avg_hours = round(avg_review['avg_time'].total_seconds() / 3600, 1)

        # Reviewer performance
        from django.db.models import Count
        reviewer_stats = DocumentReviewHistory.objects.filter(
            created_at__gte=today_start,
            new_status__in=['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'],
        ).values('changed_by_id', 'changed_by_role').annotate(
            total=Count('id'),
        ).order_by('-total')[:10]

        return ApiResponse(success=True, data={
            'pending_documents': pending,
            'approved_today': approved_today,
            'rejected_today': rejected_today,
            'changes_requested': changes_requested,
            'average_review_time_hours': avg_hours,
            'reviewer_performance': list(reviewer_stats),
        }, status=status.HTTP_200_OK)


class MemberDocumentResubmitView(APIView):
    """
    POST /api/member/verification/documents/{id}/resubmit/

    Member resubmits a rejected/changes-requested document.
    Archives the old document and creates a new one.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, document_id):
        from .services import compress_document

        member = request.user
        try:
            old_doc = MemberDocument.objects.get(pk=document_id, member=member)
        except MemberDocument.DoesNotExist:
            return ApiResponse(success=False, message='Document not found.', status=status.HTTP_404_NOT_FOUND)

        if old_doc.status not in (MemberDocument.Status.REJECTED, MemberDocument.Status.CHANGES_REQUESTED):
            return ApiResponse(
                success=False,
                message='Only rejected or changes-requested documents can be resubmitted.',
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES.get('file')
        if not file:
            return ApiResponse(success=False, message='File is required.', status=status.HTTP_400_BAD_REQUEST)

        allowed_types = [
            'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        ]
        if file.content_type not in allowed_types:
            return ApiResponse(
                success=False,
                message='Invalid file type. Allowed: PDF, JPG, PNG, WEBP',
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > 10 * 1024 * 1024:
            return ApiResponse(
                success=False,
                message='File size exceeds 10 MB limit.',
                status=status.HTTP_400_BAD_REQUEST,
            )

        document_type = request.data.get('document_type', old_doc.document_type)
        document_number = request.data.get('document_number', '')
        expiry_date_str = request.data.get('expiry_date', '')

        with transaction.atomic():
            old_doc.archive()

            _create_review_history(
                old_doc, old_doc.status, MemberDocument.Status.ARCHIVED,
                'Archived on resubmission', '', member.pk, AccountType.MEMBER, request,
            )

            file_data = compress_document(file.read())
            new_doc = MemberDocument.objects.create(
                member=member,
                document_type=document_type,
                document_number=document_number,
                file_data=file_data,
                file_name=file.name,
                file_content_type=file.content_type,
                file_size=file.size,
                compressed_size=len(file_data) if isinstance(file_data, bytes) else 0,
                status=MemberDocument.Status.PENDING,
                version_number=old_doc.version_number + 1,
                archived_from=old_doc,
                uploaded_by_id=member.pk,
                expiry_date=timezone.datetime.strptime(expiry_date_str, '%Y-%m-%d').date() if expiry_date_str else None,
            )

            _create_review_history(
                new_doc, '', MemberDocument.Status.PENDING,
                'Resubmitted after ' + ('rejection' if old_doc.status == MemberDocument.Status.REJECTED else 'changes requested'),
                '', member.pk, AccountType.MEMBER, request,
            )

            member.document_status = AccountVerificationService.STATUS_PENDING_REVIEW
            member.document_submitted_at = timezone.now()
            member.document_rejection_reason = ''
            member.save(update_fields=['document_status', 'document_submitted_at', 'document_rejection_reason', 'updated_at'])

            _log_audit(request, member, 'VERIFICATION_DOCUMENT_RESUBMITTED', new_doc, old_status=old_doc.status, new_status=MemberDocument.Status.PENDING)

            # Create verification request
            from apps.core.models import ProfileVerificationRequest
            ProfileVerificationRequest.objects.get_or_create(
                member=member,
                verification_type=ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT,
                status=ProfileVerificationRequest.Status.PENDING_REVIEW,
                defaults={'submitted_at': timezone.now()},
            )

            VerificationEvents.publish_verification_submitted(member, 'document')
            VerificationEvents.publish_document_updated(
                member, str(new_doc.id), 'resubmitted', new_doc.status
            )

        return ApiResponse(
            success=True,
            message='Document resubmitted successfully.',
            data={
                'document_id': str(new_doc.id),
                'version_number': new_doc.version_number,
                'status': new_doc.status,
            },
            status=status.HTTP_200_OK,
        )
