import secrets
from datetime import timedelta
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import ApiResponse

from .models import (
    AccountType,
    AdminActivityLog,
    AdminLoginActivity,
    AuthChallenge,
    CustomerSupportActivityLog,
    CustomerSupportLoginActivity,
    LoginStatus,
    Member,
    MemberDocument,
    MemberLoginActivity,
    MemberProfile,
    StaffActivityLog,
    StaffLoginActivity,
    SuperAdminActivityLog,
    SuperAdminLoginActivity,
)
from .security import (
    account_model_for_type,
    issue_account_tokens,
    revoke_all_account_sessions,
    revoke_session,
    rotate_refresh_token,
)
from .permissions import IsMember
from .serializers import (
    AdministrativeLoginSerializer,
    ForgotPasswordSerializer,
    MemberLoginSerializer,
    MemberProfileUpdateSerializer,
    MemberDocumentSerializer,
    MemberRegistrationSerializer,
    MemberSerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
    PasswordChangeSerializer,
    RefreshSerializer,
    ResetPasswordSerializer,
    administrative_account_payload,
)


MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024
MAX_MEMBER_DOCUMENT_SIZE = 10 * 1024 * 1024
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
IMAGE_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
DOCUMENT_EXTENSIONS = IMAGE_EXTENSIONS | {'.pdf'}
DOCUMENT_MIME_TYPES = IMAGE_MIME_TYPES | {'application/pdf'}


def _validate_real_image(upload, *, maximum_size=MAX_PROFILE_PHOTO_SIZE):
    if upload.size > maximum_size:
        raise ValidationError({'file': [f'Image must be {maximum_size // (1024 * 1024)} MB or smaller.']})
    extension = Path(upload.name).suffix.lower()
    mime_type = (getattr(upload, 'content_type', '') or '').lower()
    if extension not in IMAGE_EXTENSIONS or mime_type not in IMAGE_MIME_TYPES:
        raise ValidationError({'file': ['Upload a JPEG, PNG, or WebP image.']})
    try:
        image = Image.open(upload)
        image.verify()
        if image.format not in {'JPEG', 'PNG', 'WEBP'}:
            raise UnidentifiedImageError()
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError) as exc:
        raise ValidationError({'file': ['The uploaded file is not a valid supported image.']}) from exc
    finally:
        upload.seek(0)
    return upload


def _validate_member_document(upload):
    if upload is None:
        raise ValidationError({'file': ['Choose a document to upload.']})
    if upload.size > MAX_MEMBER_DOCUMENT_SIZE:
        raise ValidationError({'file': ['Document must be 10 MB or smaller.']})
    extension = Path(upload.name).suffix.lower()
    mime_type = (getattr(upload, 'content_type', '') or '').lower()
    if extension not in DOCUMENT_EXTENSIONS or mime_type not in DOCUMENT_MIME_TYPES:
        raise ValidationError({'file': ['Upload a PDF, JPEG, PNG, or WebP document.']})
    if extension == '.pdf':
        signature = upload.read(5)
        upload.seek(0)
        if signature != b'%PDF-':
            raise ValidationError({'file': ['The uploaded file is not a valid PDF.']})
    else:
        _validate_real_image(upload, maximum_size=MAX_MEMBER_DOCUMENT_SIZE)
    return upload


LOGIN_ACTIVITY_CONFIG = {
    AccountType.MEMBER: (MemberLoginActivity, 'member', 'login_identifier'),
    AccountType.SUPER_ADMIN: (SuperAdminLoginActivity, 'super_admin', 'email_used'),
    AccountType.ADMIN: (AdminLoginActivity, 'admin', 'email_used'),
    AccountType.STAFF: (StaffLoginActivity, 'staff', 'email_used'),
    AccountType.CUSTOMER_SUPPORT: (
        CustomerSupportLoginActivity,
        'customer_support_agent',
        'email_used',
    ),
}

OPERATIONAL_ACTIVITY_MODELS = {
    AccountType.SUPER_ADMIN: SuperAdminActivityLog,
    AccountType.ADMIN: AdminActivityLog,
    AccountType.STAFF: StaffActivityLog,
    AccountType.CUSTOMER_SUPPORT: CustomerSupportActivityLog,
}


def _client_ip(request):
    value = request.META.get('REMOTE_ADDR', '').strip()
    return value or None


def _user_agent_details(request):
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]
    lowered = user_agent.lower()
    if 'edg/' in lowered:
        browser = 'Edge'
    elif 'chrome/' in lowered:
        browser = 'Chrome'
    elif 'firefox/' in lowered:
        browser = 'Firefox'
    elif 'safari/' in lowered:
        browser = 'Safari'
    else:
        browser = 'Unknown'
    if 'windows' in lowered:
        operating_system = 'Windows'
    elif 'android' in lowered:
        operating_system = 'Android'
    elif 'iphone' in lowered or 'ipad' in lowered:
        operating_system = 'iOS'
    elif 'mac os' in lowered:
        operating_system = 'macOS'
    elif 'linux' in lowered:
        operating_system = 'Linux'
    else:
        operating_system = 'Unknown'
    device_name = 'Mobile' if 'mobile' in lowered else 'Desktop'
    return user_agent, device_name, browser, operating_system


def record_login_activity(
    *,
    account_type,
    account,
    identifier,
    login_status,
    request,
    failure_reason='',
    session_id=None,
    two_factor_status='',
):
    model, account_field, identifier_field = LOGIN_ACTIVITY_CONFIG[str(account_type)]
    user_agent, device_name, browser, operating_system = _user_agent_details(request)
    values = {
        account_field: account,
        identifier_field: identifier,
        'ip_address': _client_ip(request),
        'user_agent': user_agent,
        'device_name': device_name,
        'browser': browser,
        'operating_system': operating_system,
        'login_status': login_status,
        'failure_reason': failure_reason[:255],
        'session_id': session_id,
    }
    if account_type == AccountType.SUPER_ADMIN:
        values['two_factor_status'] = two_factor_status
    return model.objects.create(**values)


def log_operational_activity(
    *, request, actor, action, module, target_type='', target_id='', description='', old_data=None, new_data=None
):
    model = OPERATIONAL_ACTIVITY_MODELS.get(str(actor.account_type))
    if model is None:
        return None
    return model.objects.create(
        actor_id=actor.pk,
        action=action,
        module=module,
        target_type=target_type,
        target_id=str(target_id or ''),
        description=description,
        old_data=old_data or {},
        new_data=new_data or {},
        ip_address=_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:1000],
    )


def _challenge_code():
    if settings.DEBUG or getattr(settings, 'TESTING', False):
        return str(getattr(settings, 'DEVELOPER_OTP', '123456'))
    return f'{secrets.randbelow(1_000_000):06d}'


def _issue_challenge(*, account_type, identifier, purpose, request, lifetime_minutes=10):
    now = timezone.now()
    normalized = identifier.strip().lower()
    AuthChallenge.objects.filter(
        account_type=account_type,
        identifier=normalized,
        purpose=purpose,
        consumed_at__isnull=True,
    ).update(consumed_at=now)
    code = _challenge_code()
    AuthChallenge.objects.create(
        account_type=account_type,
        identifier=normalized,
        purpose=purpose,
        code_digest=make_password(code),
        expires_at=now + timedelta(minutes=lifetime_minutes),
        requested_ip=_client_ip(request),
    )
    return code


@transaction.atomic
def _consume_challenge(*, account_type, identifier, purpose, code):
    challenge = (
        AuthChallenge.objects.select_for_update()
        .filter(
            account_type=account_type,
            identifier=identifier.strip().lower(),
            purpose=purpose,
            consumed_at__isnull=True,
        )
        .order_by('-created_at')
        .first()
    )
    if challenge is None or not challenge.is_usable:
        return False
    if not check_password(code, challenge.code_digest):
        challenge.attempts += 1
        if challenge.attempts >= challenge.max_attempts:
            challenge.consumed_at = timezone.now()
        challenge.save(update_fields=('attempts', 'consumed_at'))
        return False
    challenge.consumed_at = timezone.now()
    challenge.save(update_fields=('consumed_at',))
    return True


def _account_payload(account, request=None):
    if account.account_type == AccountType.MEMBER:
        return MemberSerializer(account, context={'request': request}).data
    return administrative_account_payload(account)


def _ensure_account_type(request, expected):
    if str(getattr(request.user, 'account_type', '')) != str(expected):
        raise PermissionDenied('This token belongs to a different account type.')


class MemberRegisterView(APIView):
    permission_classes = (permissions.AllowAny,)

    @transaction.atomic
    def post(self, request):
        serializer = MemberRegistrationSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            formatted_errors = {}
            for field, messages in exc.detail.items():
                if isinstance(messages, list):
                    formatted_errors[field] = [str(m) for m in messages]
                elif isinstance(messages, dict):
                    # handle dict structure (like nested fields or custom validations)
                    for subfield, submsgs in messages.items():
                        subfield_name = f"{field}.{subfield}" if field != "non_field_errors" else subfield
                        if isinstance(submsgs, list):
                            formatted_errors[subfield_name] = [str(m) for m in submsgs]
                        else:
                            formatted_errors[subfield_name] = [str(submsgs)]
                else:
                    formatted_errors[field] = [str(messages)]
            return ApiResponse(
                success=False,
                message="Please correct the highlighted fields.",
                errors=formatted_errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        member = serializer.save()
        tokens = issue_account_tokens(member)
        record_login_activity(
            account_type=AccountType.MEMBER,
            account=member,
            identifier=member.email,
            login_status=LoginStatus.SUCCESS,
            request=request,
            session_id=tokens['session_id'],
        )
        return ApiResponse(
            data={**tokens, 'user': _account_payload(member, request)},
            message='Registration successful.',
            status=status.HTTP_201_CREATED,
        )


class MemberLoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'login'

    def post(self, request):
        serializer = MemberLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip()
        if '@' in identifier:
            member = Member.objects.filter(email__iexact=identifier).first()
        else:
            member = Member.objects.filter(mobile_number=identifier).first()

        if member is None or not member.check_password(serializer.validated_data['password']):
            record_login_activity(
                account_type=AccountType.MEMBER,
                account=member,
                identifier=identifier,
                login_status=LoginStatus.FAILED,
                failure_reason='Invalid credentials',
                request=request,
            )
            return ApiResponse(
                success=False,
                message='Unable to sign in with the supplied credentials.',
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not member.is_active or member.deleted_at is not None:
            record_login_activity(
                account_type=AccountType.MEMBER,
                account=member,
                identifier=identifier,
                login_status=LoginStatus.BLOCKED,
                failure_reason='Inactive member account',
                request=request,
            )
            return ApiResponse(success=False, message='This account is inactive.', status=status.HTTP_403_FORBIDDEN)

        member.last_login = timezone.now()
        member.save(update_fields=('last_login', 'updated_at'))
        tokens = issue_account_tokens(member)
        record_login_activity(
            account_type=AccountType.MEMBER,
            account=member,
            identifier=identifier,
            login_status=LoginStatus.SUCCESS,
            request=request,
            session_id=tokens['session_id'],
        )
        return ApiResponse(data={**tokens, 'user': _account_payload(member, request)}, message='Login successful.')


class AdministrativeLoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'login'
    account_type = None

    def post(self, request):
        serializer = AdministrativeLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data['password']

        # Portal mismatch check
        LOGIN_URL_MAP = {
            AccountType.SUPER_ADMIN: '/super-admin/login',
            AccountType.ADMIN: '/admin/login',
            AccountType.STAFF: '/staff/login',
            AccountType.CUSTOMER_SUPPORT: '/customer-support/login',
        }
        for typ in (AccountType.SUPER_ADMIN, AccountType.ADMIN, AccountType.STAFF, AccountType.CUSTOMER_SUPPORT):
            model_cls = account_model_for_type(typ)
            acc = model_cls.objects.filter(email__iexact=email).select_related('role').first()
            if acc:
                if acc.check_password(password):
                    if str(acc.account_type) != str(self.account_type):
                        return ApiResponse(
                            success=False,
                            data={
                                "code": "ACCOUNT_PORTAL_MISMATCH",
                                "correct_portal": str(acc.account_type),
                                "correct_login_url": LOGIN_URL_MAP.get(acc.account_type, '/admin/login'),
                            },
                            message="Use the correct administrative portal for this account.",
                            status=status.HTTP_400_BAD_REQUEST
                        )
                break

        model = account_model_for_type(self.account_type)
        account = model.objects.filter(email__iexact=email).select_related('role').first()

        if account is None:
            record_login_activity(
                account_type=self.account_type,
                account=None,
                identifier=email,
                login_status=LoginStatus.FAILED,
                failure_reason='Invalid credentials',
                request=request,
            )
            return ApiResponse(success=False, message='Unable to sign in.', status=status.HTTP_401_UNAUTHORIZED)
        if not account.is_active or account.deleted_at is not None:
            record_login_activity(
                account_type=self.account_type,
                account=account,
                identifier=email,
                login_status=LoginStatus.BLOCKED,
                failure_reason='Inactive account',
                request=request,
            )
            return ApiResponse(success=False, message='This account is inactive.', status=status.HTTP_403_FORBIDDEN)
        if account.is_account_locked:
            record_login_activity(
                account_type=self.account_type,
                account=account,
                identifier=email,
                login_status=LoginStatus.LOCKED,
                failure_reason='Temporary login lock',
                request=request,
            )
            return ApiResponse(success=False, message='Account temporarily locked.', status=status.HTTP_423_LOCKED)
        if not account.check_password(serializer.validated_data['password']):
            max_attempts = int(getattr(settings, 'ADMIN_MAX_FAILED_LOGIN_ATTEMPTS', 5))
            account.failed_login_attempts += 1
            if account.failed_login_attempts >= max_attempts:
                account.locked_until = timezone.now() + timedelta(
                    minutes=int(getattr(settings, 'ADMIN_LOCKOUT_MINUTES', 15))
                )
            account.save(update_fields=('failed_login_attempts', 'locked_until', 'updated_at'))
            login_status = LoginStatus.LOCKED if account.is_account_locked else LoginStatus.FAILED
            record_login_activity(
                account_type=self.account_type,
                account=account,
                identifier=email,
                login_status=login_status,
                failure_reason='Invalid credentials',
                request=request,
            )
            return ApiResponse(success=False, message='Unable to sign in.', status=status.HTTP_401_UNAUTHORIZED)

        requires_two_factor = bool(
            self.account_type == AccountType.SUPER_ADMIN
            and (account.two_factor_enabled or getattr(settings, 'SUPER_ADMIN_2FA_REQUIRED', False))
        )
        if requires_two_factor:
            otp = serializer.validated_data.get('otp', '').strip()
            if not otp:
                code = _issue_challenge(
                    account_type=self.account_type,
                    identifier=email,
                    purpose=AuthChallenge.Purpose.TWO_FACTOR,
                    request=request,
                    lifetime_minutes=5,
                )
                send_mail(
                    'Your My Dear Partner super-admin sign-in code',
                    f'Your one-time sign-in code is {code}. It expires in 5 minutes.',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=not settings.DEBUG,
                )
                data = {'requires_two_factor': True, 'expires_in': 300}
                if settings.DEBUG:
                    data['developer_otp'] = code
                return ApiResponse(data=data, message='Two-factor verification is required.', status=status.HTTP_202_ACCEPTED)
            if not _consume_challenge(
                account_type=self.account_type,
                identifier=email,
                purpose=AuthChallenge.Purpose.TWO_FACTOR,
                code=otp,
            ):
                record_login_activity(
                    account_type=self.account_type,
                    account=account,
                    identifier=email,
                    login_status=LoginStatus.TWO_FACTOR_FAILED,
                    failure_reason='Invalid or expired two-factor code',
                    request=request,
                    two_factor_status='FAILED',
                )
                return ApiResponse(
                    success=False,
                    message='Invalid or expired verification code.',
                    status=status.HTTP_400_BAD_REQUEST,
                )

        account.failed_login_attempts = 0
        account.locked_until = None
        account.last_login = timezone.now()
        account.save(update_fields=('failed_login_attempts', 'locked_until', 'last_login', 'updated_at'))
        tokens = issue_account_tokens(account)
        record_login_activity(
            account_type=self.account_type,
            account=account,
            identifier=email,
            login_status=LoginStatus.SUCCESS,
            request=request,
            session_id=tokens['session_id'],
            two_factor_status='SUCCESS' if requires_two_factor else 'NOT_REQUIRED',
        )
        return ApiResponse(data={**tokens, 'user': _account_payload(account, request)}, message='Login successful.')


class SuperAdminLoginView(AdministrativeLoginView):
    account_type = AccountType.SUPER_ADMIN


class AdminLoginView(AdministrativeLoginView):
    account_type = AccountType.ADMIN


class StaffLoginView(AdministrativeLoginView):
    account_type = AccountType.STAFF


class CustomerSupportLoginView(AdministrativeLoginView):
    account_type = AccountType.CUSTOMER_SUPPORT


class AccountRefreshView(APIView):
    permission_classes = (permissions.AllowAny,)
    account_type = None

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = rotate_refresh_token(
            serializer.validated_data['refresh'],
            expected_account_type=self.account_type,
        )
        return ApiResponse(data=tokens, message='Token refreshed successfully.')


class AccountLogoutView(APIView):
    # A valid refresh token is the credential for logout.  Keeping this
    # endpoint independent of the access token lets the browser clear local
    # auth state first and still make a best-effort server-side revocation.
    permission_classes = (permissions.AllowAny,)
    account_type = None

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = revoke_session(
            serializer.validated_data['refresh'],
            expected_account_type=self.account_type,
        )
        if session:
            model, _, _ = LOGIN_ACTIVITY_CONFIG[str(self.account_type)]
            model.objects.filter(session_id=session.pk, logged_out_at__isnull=True).update(
                login_status=LoginStatus.LOGGED_OUT,
                logged_out_at=timezone.now(),
            )
        return ApiResponse(message='Logout successful.')


class AccountLogoutAllView(APIView):
    """Revoke every refresh session for the authenticated account."""

    permission_classes = (permissions.IsAuthenticated,)
    account_type = None

    @transaction.atomic
    def post(self, request):
        _ensure_account_type(request, self.account_type)
        revoke_all_account_sessions(request.user)
        return ApiResponse(message='Signed out on every device.')


class AccountMeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    account_type = None

    def get(self, request):
        _ensure_account_type(request, self.account_type)
        return ApiResponse(data=_account_payload(request.user, request))


class AccountChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    account_type = None

    @transaction.atomic
    def post(self, request):
        _ensure_account_type(request, self.account_type)
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.password_changed_at = timezone.now()
        request.user.save(update_fields=('password', 'password_changed_at', 'updated_at'))
        revoke_all_account_sessions(request.user)
        if request.user.account_type != AccountType.MEMBER:
            log_operational_activity(
                request=request,
                actor=request.user,
                action='PASSWORD_CHANGED',
                module='authentication',
                target_type=str(request.user.account_type),
                target_id=request.user.pk,
            )
        return ApiResponse(message='Password changed. Sign in again on every device.')


class MemberMeView(AccountMeView):
    account_type = AccountType.MEMBER
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def patch(self, request):
        _ensure_account_type(request, self.account_type)
        profile_data = request.data.copy()
        profile_data.pop('photo', None)
        serializer = MemberProfileUpdateSerializer(
            request.user,
            data=profile_data,
            partial=True,
            context={'member': request.user},
        )
        serializer.is_valid(raise_exception=True)
        photo_upload = request.FILES.get('photo')
        processed_photo = None
        from apps.profiles.services.image_processing import (
            ImageProcessingService,
            ProfilePhotoProcessingError,
        )

        if photo_upload is not None:
            # Decode/crop/compress before opening a database transaction so a
            # PgBouncer server connection is not held during CPU-heavy Pillow
            # work. The processed value contains only bounded WebP bytes.
            try:
                processed_photo = ImageProcessingService.process_profile_photo(photo_upload)
            except ProfilePhotoProcessingError as exc:
                raise ValidationError({'photo': [str(exc)]}) from exc

        try:
            with transaction.atomic():
                member = serializer.save()
                if processed_photo is not None:
                    # Compatibility for the old profile PATCH form: replace
                    # the primary in place, or create the first BYTEA photo.
                    from apps.profiles.models import ProfilePhoto
                    from apps.profiles.services.photo_management import (
                        _create_processed_profile_photo,
                        _replace_processed_profile_photo,
                    )

                    primary = (
                        ProfilePhoto.objects.without_binary()
                        .filter(user=member, is_primary=True)
                        .first()
                    )
                    if primary is None:
                        _create_processed_profile_photo(
                            member=member,
                            processed=processed_photo,
                            uploaded_file=photo_upload,
                            actor=member,
                        )
                    else:
                        _replace_processed_profile_photo(
                            photo_id=primary.pk,
                            member=member,
                            processed=processed_photo,
                            uploaded_file=photo_upload,
                            actor=member,
                        )
        except ProfilePhotoProcessingError as exc:
            raise ValidationError({'photo': [str(exc)]}) from exc
        return ApiResponse(data=_account_payload(member, request), message='Profile updated successfully.')


class MemberDocumentListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (FormParser, MultiPartParser)

    def get(self, request):
        _ensure_account_type(request, AccountType.MEMBER)
        documents = MemberDocument.objects.filter(member=request.user)
        return ApiResponse(
            data=MemberDocumentSerializer(documents, many=True, context={'request': request}).data
        )

    @transaction.atomic
    def post(self, request):
        _ensure_account_type(request, AccountType.MEMBER)
        document_type = str(request.data.get('document_type', '')).strip()
        if not document_type:
            raise ValidationError({'document_type': ['Document type is required.']})
        if len(document_type) > 80:
            raise ValidationError({'document_type': ['Document type must be 80 characters or fewer.']})
        upload = _validate_member_document(request.FILES.get('file') or request.FILES.get('document'))
        verification_required = getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False)
        document = MemberDocument.objects.create(
            member=request.user,
            document_type=document_type,
            file_path=upload,
            status=(
                MemberDocument.Status.PENDING
                if verification_required
                else MemberDocument.Status.APPROVED
            ),
            reviewed_at=None if verification_required else timezone.now(),
        )
        request.user.document_status = (
            Member.ReviewStatus.PENDING
            if verification_required
            else Member.ReviewStatus.APPROVED
        )
        request.user.save(update_fields=('document_status', 'updated_at'))

        if verification_required:
            from apps.core.models import ProfileVerificationDocument, ProfileVerificationRequest

            active_statuses = (
                ProfileVerificationRequest.Status.PENDING,
                ProfileVerificationRequest.Status.ASSIGNED,
                ProfileVerificationRequest.Status.IN_REVIEW,
            )
            verification = ProfileVerificationRequest.objects.filter(
                member=request.user,
                verification_type=ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT,
                status__in=active_statuses,
            ).first()
            if verification is None:
                verification = ProfileVerificationRequest.objects.create(
                    member=request.user,
                    verification_type=ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT,
                )
            ProfileVerificationDocument.objects.create(
                verification_request=verification,
                member_document=document,
            )
        return ApiResponse(
            data=MemberDocumentSerializer(document, context={'request': request}).data,
            message=(
                'Document uploaded for private verification.'
                if verification_required
                else 'Document uploaded successfully.'
            ),
            status=status.HTTP_201_CREATED,
        )


class MemberProfileSubmitView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @transaction.atomic
    def post(self, request):
        _ensure_account_type(request, AccountType.MEMBER)
        profile, _ = MemberProfile.objects.get_or_create(member=request.user)
        required = {
            'mobile_number': request.user.mobile_number,
            'gender': request.user.gender,
            'date_of_birth': request.user.date_of_birth,
            'religion': profile.religion,
            'mother_tongue': profile.mother_tongue,
            'about': profile.about,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            return ApiResponse(
                success=False,
                message='Complete required profile fields before submitting.',
                errors={'missing_fields': missing},
                status=status.HTTP_400_BAD_REQUEST,
            )
        verification_required = getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False)
        request.user.profile_status = (
            Member.ProfileStatus.PENDING
            if verification_required
            else Member.ProfileStatus.APPROVED
        )
        request.user.save(update_fields=('profile_status', 'updated_at'))
        profile.submitted_at = timezone.now()
        profile.rejection_reason = ''
        profile.save(update_fields=('submitted_at', 'rejection_reason', 'updated_at'))
        if not verification_required:
            return ApiResponse(
                data=_account_payload(request.user, request),
                message='Profile is live.',
            )

        from apps.core.models import ProfileVerificationRequest

        ProfileVerificationRequest.objects.create(
            member=request.user,
            verification_type=ProfileVerificationRequest.VerificationType.FULL_PROFILE,
        )

        # Run duplicate account detection (synchronous; swap for Celery task in production)
        try:
            from apps.accounts.duplicate_detection import run_duplicate_checks
            run_duplicate_checks(request.user)
        except Exception:
            # Never block profile submission due to detection errors
            import logging
            logging.getLogger(__name__).exception(
                'Duplicate detection failed for member %s', request.user.pk
            )

        return ApiResponse(data=_account_payload(request.user, request), message='Profile submitted for verification.')


class MemberForgotPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'reset-password'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip().lower()
        member = (
            Member.objects.filter(email__iexact=identifier).first()
            if '@' in identifier
            else Member.objects.filter(mobile_number=identifier).first()
        )
        developer_otp = None
        if member and member.is_active and member.deleted_at is None:
            developer_otp = _issue_challenge(
                account_type=AccountType.MEMBER,
                identifier=identifier,
                purpose=AuthChallenge.Purpose.PASSWORD_RESET,
                request=request,
            )
            if '@' in identifier:
                send_mail(
                    'Your My Dear Partner password reset code',
                    f'Your one-time reset code is {developer_otp}. It expires in 10 minutes.',
                    settings.DEFAULT_FROM_EMAIL,
                    [member.email],
                    fail_silently=not settings.DEBUG,
                )
        data = {'expires_in': 600}
        if settings.DEBUG:
            data['developer_otp'] = developer_otp
        return ApiResponse(data=data, message='If the member exists, a reset code has been sent.')


class MemberResetPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)

    @transaction.atomic
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip().lower()
        member = (
            Member.objects.filter(email__iexact=identifier).first()
            if '@' in identifier
            else Member.objects.filter(mobile_number=identifier).first()
        )
        if member is None or not _consume_challenge(
            account_type=AccountType.MEMBER,
            identifier=identifier,
            purpose=AuthChallenge.Purpose.PASSWORD_RESET,
            code=serializer.validated_data['code'],
        ):
            return Response({'code': ['Invalid or expired reset code.']}, status=status.HTTP_400_BAD_REQUEST)
        member.set_password(serializer.validated_data['new_password'])
        member.password_changed_at = timezone.now()
        member.save(update_fields=('password', 'password_changed_at', 'updated_at'))
        revoke_all_account_sessions(member)
        return ApiResponse(message='Password reset successfully.')


class MemberOtpRequestView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'login'

    def post(self, request):
        serializer = OtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip().lower()
        purpose = serializer.validated_data['purpose']
        if purpose not in {
            AuthChallenge.Purpose.REGISTRATION,
            AuthChallenge.Purpose.PHONE_VERIFY,
            AuthChallenge.Purpose.PASSWORDLESS_LOGIN,
        }:
            return ApiResponse(success=False, message='Unsupported OTP purpose.', status=status.HTTP_400_BAD_REQUEST)
        member = (
            Member.objects.filter(email__iexact=identifier).first()
            if '@' in identifier
            else Member.objects.filter(mobile_number=identifier).first()
        )
        code = None
        if member:
            code = _issue_challenge(
                account_type=AccountType.MEMBER,
                identifier=identifier,
                purpose=purpose,
                request=request,
                lifetime_minutes=5,
            )
        data = {'expires_in': 300}
        if settings.DEBUG:
            data['developer_otp'] = code
        return ApiResponse(data=data, message='If the member exists, a verification code has been sent.')


class MemberOtpVerifyView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip().lower()
        purpose = serializer.validated_data['purpose']
        if not _consume_challenge(
            account_type=AccountType.MEMBER,
            identifier=identifier,
            purpose=purpose,
            code=serializer.validated_data['code'],
        ):
            return ApiResponse(success=False, message='Invalid or expired verification code.', status=status.HTTP_400_BAD_REQUEST)
        member = (
            Member.objects.filter(email__iexact=identifier).first()
            if '@' in identifier
            else Member.objects.filter(mobile_number=identifier).first()
        )
        if member is None:
            return ApiResponse(success=False, message='Member not found.', status=status.HTTP_404_NOT_FOUND)
        if '@' in identifier:
            member.is_email_verified = True
            update_fields = ('is_email_verified', 'updated_at')
        else:
            member.is_mobile_verified = True
            update_fields = ('is_mobile_verified', 'updated_at')
        member.save(update_fields=update_fields)
        data = {'verified': True, 'user': _account_payload(member, request)}
        if purpose == AuthChallenge.Purpose.PASSWORDLESS_LOGIN:
            tokens = issue_account_tokens(member)
            data.update(tokens)
            record_login_activity(
                account_type=AccountType.MEMBER,
                account=member,
                identifier=identifier,
                login_status=LoginStatus.SUCCESS,
                request=request,
                session_id=tokens['session_id'],
            )
        return ApiResponse(data=data, message='Verification successful.')


def _typed_view(base, account_type, name):
    return type(name, (base,), {'account_type': account_type})


MemberRefreshView = _typed_view(AccountRefreshView, AccountType.MEMBER, 'MemberRefreshView')
MemberLogoutView = _typed_view(AccountLogoutView, AccountType.MEMBER, 'MemberLogoutView')
MemberLogoutAllView = _typed_view(AccountLogoutAllView, AccountType.MEMBER, 'MemberLogoutAllView')
MemberChangePasswordView = _typed_view(AccountChangePasswordView, AccountType.MEMBER, 'MemberChangePasswordView')

SuperAdminRefreshView = _typed_view(AccountRefreshView, AccountType.SUPER_ADMIN, 'SuperAdminRefreshView')
SuperAdminLogoutView = _typed_view(AccountLogoutView, AccountType.SUPER_ADMIN, 'SuperAdminLogoutView')
SuperAdminLogoutAllView = _typed_view(AccountLogoutAllView, AccountType.SUPER_ADMIN, 'SuperAdminLogoutAllView')
SuperAdminMeView = _typed_view(AccountMeView, AccountType.SUPER_ADMIN, 'SuperAdminMeView')
SuperAdminChangePasswordView = _typed_view(AccountChangePasswordView, AccountType.SUPER_ADMIN, 'SuperAdminChangePasswordView')

AdminRefreshView = _typed_view(AccountRefreshView, AccountType.ADMIN, 'AdminRefreshView')
AdminLogoutView = _typed_view(AccountLogoutView, AccountType.ADMIN, 'AdminLogoutView')
AdminLogoutAllView = _typed_view(AccountLogoutAllView, AccountType.ADMIN, 'AdminLogoutAllView')
AdminMeView = _typed_view(AccountMeView, AccountType.ADMIN, 'AdminMeView')
AdminChangePasswordView = _typed_view(AccountChangePasswordView, AccountType.ADMIN, 'AdminChangePasswordView')

StaffRefreshView = _typed_view(AccountRefreshView, AccountType.STAFF, 'StaffRefreshView')
StaffLogoutView = _typed_view(AccountLogoutView, AccountType.STAFF, 'StaffLogoutView')
StaffLogoutAllView = _typed_view(AccountLogoutAllView, AccountType.STAFF, 'StaffLogoutAllView')
StaffMeView = _typed_view(AccountMeView, AccountType.STAFF, 'StaffMeView')
StaffChangePasswordView = _typed_view(AccountChangePasswordView, AccountType.STAFF, 'StaffChangePasswordView')


class MemberVerificationStatusView(APIView):
    """
    GET /api/v1/member-auth/verification-status/
    
    Get current account verification status summary.
    
    Response:
        {
            "success": true,
            "data": {
                "account_status": "INCOMPLETE" | "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED",
                "is_verified": bool,
                "profile": {
                    "status": "incomplete" | "pending" | "approved" | "rejected",
                    "submitted_at": "2026-07-16T10:30:00Z",
                    "reviewed_at": "2026-07-17T10:30:00Z",
                    "reason": null | "rejection reason"
                },
                "primary_photo": {
                    "status": "incomplete" | "pending" | "approved" | "rejected",
                    "submitted_at": "2026-07-16T10:30:00Z",
                    "reviewed_at": "2026-07-17T10:30:00Z",
                    "reason": null | "rejection reason"
                },
                "documents": {
                    "status": "incomplete" | "pending" | "approved" | "rejected",
                    "submitted_at": "2026-07-16T10:30:00Z",
                    "reviewed_at": "2026-07-17T10:30:00Z",
                    "reason": null | "rejection reason"
                },
                "next_action": "Complete your profile...",
                "membership_pending": bool  # true if pending_verification membership exists
            }
        }
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def get(self, request):
        from apps.accounts.verification_service import AccountVerificationService
        from apps.core.models import MemberMembership
        
        member = request.user
        
        # Get verification summary
        verification_summary = AccountVerificationService.get_verification_summary(member)
        
        # Check if there's a pending verification membership
        pending_membership = MemberMembership.objects.filter(
            member=member,
            status='PENDING_VERIFICATION'
        ).exists()
        
        data = {
            'account_status': verification_summary.account_status,
            'is_verified': verification_summary.is_verified,
            'profile': verification_summary.profile,
            'primary_photo': verification_summary.primary_photo,
            'documents': verification_summary.documents,
            'next_action': verification_summary.next_action,
            'membership_pending': pending_membership,
        }
        
        return ApiResponse(
            success=True,
            data=data,
            status=status.HTTP_200_OK
        )


CustomerSupportRefreshView = _typed_view(AccountRefreshView, AccountType.CUSTOMER_SUPPORT, 'CustomerSupportRefreshView')
CustomerSupportLogoutView = _typed_view(AccountLogoutView, AccountType.CUSTOMER_SUPPORT, 'CustomerSupportLogoutView')
CustomerSupportLogoutAllView = _typed_view(
    AccountLogoutAllView,
    AccountType.CUSTOMER_SUPPORT,
    'CustomerSupportLogoutAllView',
)
CustomerSupportMeView = _typed_view(AccountMeView, AccountType.CUSTOMER_SUPPORT, 'CustomerSupportMeView')
CustomerSupportChangePasswordView = _typed_view(AccountChangePasswordView, AccountType.CUSTOMER_SUPPORT, 'CustomerSupportChangePasswordView')


# Legacy class names point only to member auth. They no longer authenticate administrators.
RegisterView = MemberRegisterView
CustomTokenObtainPairView = MemberLoginView
CustomTokenRefreshView = MemberRefreshView
LogoutView = MemberLogoutView
UserMeView = MemberMeView
ChangePasswordView = MemberChangePasswordView
ForgotPasswordView = MemberForgotPasswordView
ResetPasswordView = MemberResetPasswordView
OtpRequestView = MemberOtpRequestView
OtpVerifyView = MemberOtpVerifyView
ProfileSubmitView = MemberProfileSubmitView
