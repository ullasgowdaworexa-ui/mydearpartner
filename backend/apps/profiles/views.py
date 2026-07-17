"""Private API endpoints for PostgreSQL ``BYTEA`` profile photos."""

from __future__ import annotations

from django.http import Http404, HttpResponse
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AccountType
from apps.core.responses import ApiResponse

from .models import ProfilePhoto
from .photo_permissions import can_review_profile_photos, can_view_profile_photo
from .serializers import ProfilePhotoSerializer
from .services.image_processing import ProfilePhotoProcessingError
from .services.photo_management import (
    MAX_PROFILE_PHOTOS,
    create_profile_photo,
    delete_profile_photo,
    reorder_profile_photos,
    replace_profile_photo,
    review_profile_photo,
    set_primary_profile_photo,
)


def _require_active_member(request):
    user = request.user
    if (
        str(getattr(user, "account_type", "")) != AccountType.MEMBER
        or not getattr(user, "is_active", False)
        or getattr(user, "deleted_at", None) is not None
        or getattr(user, "account_status", None) != "ACTIVE"
    ):
        raise PermissionDenied("An active member account is required.")
    return user


def _require_photo_reviewer(request, photo_id, *, action: str):
    photo = _photo_metadata_or_404(photo_id)
    if not can_review_profile_photos(request.user, photo, action=action):
        raise PermissionDenied("You do not have permission to review profile photos.")
    from apps.core.role_views import check_object_scope

    check_object_scope(request.user, photo.user, branch_path="branch")
    return request.user


def _uploaded_photo(request):
    uploaded = request.FILES.get("photo") or request.FILES.get("image")
    if uploaded is None:
        raise ProfilePhotoProcessingError("Send the image as multipart field 'photo'.")
    return uploaded


def _error_response(error: Exception, *, field="photo"):
    return Response({field: [str(error)]}, status=status.HTTP_400_BAD_REQUEST)


def _etag_matches(request, etag: str) -> bool:
    incoming = request.META.get("HTTP_IF_NONE_MATCH", "")
    candidates = {value.strip() for value in incoming.split(",")}
    return "*" in candidates or etag in candidates or f"W/{etag}" in candidates


def _photo_metadata_or_404(photo_id) -> ProfilePhoto:
    """Fetch permission/ETag metadata without either BYTEA value."""
    fields = (
        "id",
        "user_id",
        "status",
        "checksum",
        "mime_type",
        "compressed_size_bytes",
        "thumbnail_size_bytes",
        "user__id",
        "user__is_active",
        "user__deleted_at",
        "user__account_status",
        "user__is_hidden",
        "user__profile_status",
    )
    try:
        return (
            ProfilePhoto.objects.without_binary()
            .select_related("user")
            .only(*fields)
            .get(pk=photo_id)
        )
    except ProfilePhoto.DoesNotExist as exc:
        raise Http404("Profile photo not found.") from exc


def _binary_photo_or_404(metadata: ProfilePhoto, field_name: str) -> ProfilePhoto:
    """Fetch one BYTEA column only while the authorized snapshot still matches."""
    try:
        return (
            ProfilePhoto.objects.only("id", "mime_type", field_name)
            .get(
                pk=metadata.pk,
                user_id=metadata.user_id,
                status=metadata.status,
                checksum=metadata.checksum,
                user__is_active=metadata.user.is_active,
                user__deleted_at=metadata.user.deleted_at,
                user__account_status=metadata.user.account_status,
                user__is_hidden=metadata.user.is_hidden,
                user__profile_status=metadata.user.profile_status,
            )
        )
    except ProfilePhoto.DoesNotExist as exc:
        raise Http404("Profile photo not found.") from exc


class ProfilePhotoCollectionView(APIView):
    """Create a photo from multipart form data (and list as a convenience)."""

    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (FormParser, MultiPartParser)

    def post(self, request):
        member = _require_active_member(request)
        try:
            photo = create_profile_photo(
                member=member,
                uploaded_file=_uploaded_photo(request),
                actor=member,
            )
        except ProfilePhotoProcessingError as exc:
            return _error_response(exc)

        return ApiResponse(
            data=ProfilePhotoSerializer(photo, context={"request": request}).data,
            message="Photo uploaded successfully.",
            status=status.HTTP_201_CREATED,
        )

    def get(self, request):
        return ProfilePhotoMineView().get(request)


class ProfilePhotoMineView(APIView):
    """Return the owner’s image metadata without either binary column."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        member = _require_active_member(request)
        photos = (
            ProfilePhoto.objects.without_binary()
            .filter(user=member)
            .order_by("display_order", "created_at")
        )
        serialized = ProfilePhotoSerializer(photos, many=True, context={"request": request}).data
        return ApiResponse(
            data={"photos": serialized, "count": len(serialized), "max_photos": MAX_PROFILE_PHOTOS},
            message="Profile photos retrieved successfully.",
        )


class ProfilePhotoDetailView(APIView):
    """Replace or delete a member-owned photo."""

    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (FormParser, MultiPartParser, JSONParser)

    def patch(self, request, photo_id):
        member = _require_active_member(request)
        try:
            photo = replace_profile_photo(
                photo_id=photo_id,
                member=member,
                uploaded_file=_uploaded_photo(request),
                actor=member,
            )
        except ProfilePhoto.DoesNotExist as exc:
            raise Http404("Profile photo not found.") from exc
        except ProfilePhotoProcessingError as exc:
            return _error_response(exc)
        return ApiResponse(
            data=ProfilePhotoSerializer(photo, context={"request": request}).data,
            message="Photo replaced successfully.",
        )

    def delete(self, request, photo_id):
        member = _require_active_member(request)
        try:
            replacement = delete_profile_photo(photo_id=photo_id, member=member, actor=member)
        except ProfilePhoto.DoesNotExist as exc:
            raise Http404("Profile photo not found.") from exc
        data = {
            "primary_photo_id": str(replacement.pk) if replacement else None,
            "max_photos": MAX_PROFILE_PHOTOS,
        }
        return ApiResponse(data=data, message="Photo deleted successfully.")


class ProfilePhotoSetPrimaryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, photo_id):
        member = _require_active_member(request)
        try:
            photo = set_primary_profile_photo(photo_id=photo_id, member=member, actor=member)
        except ProfilePhoto.DoesNotExist as exc:
            raise Http404("Profile photo not found.") from exc
        except ProfilePhotoProcessingError as exc:
            return _error_response(exc, field="detail")
        return ApiResponse(
            data=ProfilePhotoSerializer(photo, context={"request": request}).data,
            message="Primary photo updated successfully.",
        )


class ProfilePhotoReorderView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (JSONParser,)

    def post(self, request):
        member = _require_active_member(request)
        photo_ids = request.data.get("photo_ids")
        if not isinstance(photo_ids, list):
            return Response(
                {"photo_ids": ["Provide an array of photo ids."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            photos = reorder_profile_photos(
                member=member,
                photo_ids=photo_ids,
                actor=member,
            )
        except ProfilePhotoProcessingError as exc:
            return Response(
                {"photo_ids": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST
            )
        return ApiResponse(
            data=ProfilePhotoSerializer(photos, many=True, context={"request": request}).data,
            message="Photos reordered successfully.",
        )


class _ProfilePhotoBinaryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    binary_field = ""
    etag_suffix = ""

    def _authorized_metadata(self, request, photo_id) -> ProfilePhoto:
        metadata = _photo_metadata_or_404(photo_id)
        if not can_view_profile_photo(request.user, metadata):
            raise PermissionDenied("You are not allowed to view this profile photo.")
        if str(getattr(request.user, "account_type", "")) in {
            AccountType.ADMIN,
            AccountType.STAFF,
        }:
            from apps.core.role_views import check_object_scope

            check_object_scope(request.user, metadata.user, branch_path="branch")
        return metadata

    def _apply_private_headers(self, response, etag: str):
        response["ETag"] = etag
        response["Cache-Control"] = "private, max-age=86400"
        response["Vary"] = "Authorization"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def head(self, request, photo_id):
        """Return validators and stored length without fetching either BYTEA."""
        metadata = self._authorized_metadata(request, photo_id)
        etag = f'"{metadata.checksum}{self.etag_suffix}"'
        if _etag_matches(request, etag):
            response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
        else:
            response = HttpResponse(status=status.HTTP_200_OK, content_type=metadata.mime_type)
            size_field = (
                "thumbnail_size_bytes"
                if self.binary_field == "thumbnail_data"
                else "compressed_size_bytes"
            )
            response["Content-Length"] = str(getattr(metadata, size_field))
        return self._apply_private_headers(response, etag)

    def get(self, request, photo_id):
        # Do not fetch a 600 KB BYTEA payload merely to deny a UUID probe.
        # The metadata query intentionally defers both binary columns.
        metadata = self._authorized_metadata(request, photo_id)

        etag = f'"{metadata.checksum}{self.etag_suffix}"'
        if _etag_matches(request, etag):
            response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
        else:
            photo = _binary_photo_or_404(metadata, self.binary_field)
            # A reciprocal block can be created independently of the photo
            # row. Recheck immediately before emitting bytes; changed photo or
            # account state also fails closed through the snapshot query above.
            fresh_metadata = _photo_metadata_or_404(photo_id)
            if (
                fresh_metadata.checksum != metadata.checksum
                or fresh_metadata.status != metadata.status
                or not can_view_profile_photo(request.user, fresh_metadata)
            ):
                raise PermissionDenied("You are not allowed to view this profile photo.")
            image_bytes = bytes(getattr(photo, self.binary_field))
            response = HttpResponse(image_bytes, content_type=photo.mime_type)
            response["Content-Length"] = str(len(image_bytes))
        return self._apply_private_headers(response, etag)


class ProfilePhotoImageView(_ProfilePhotoBinaryView):
    binary_field = "image_data"
    etag_suffix = ""


class ProfilePhotoThumbnailView(_ProfilePhotoBinaryView):
    binary_field = "thumbnail_data"
    etag_suffix = "-thumbnail"


class AdminProfilePhotoApproveView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, photo_id):
        reviewer = _require_photo_reviewer(request, photo_id, action="approve")
        try:
            photo = review_profile_photo(photo_id=photo_id, reviewer=reviewer, approve=True)
        except ProfilePhoto.DoesNotExist as exc:
            raise Http404("Profile photo not found.") from exc
        except ProfilePhotoProcessingError as exc:
            return _error_response(exc, field="detail")
        return ApiResponse(
            data=ProfilePhotoSerializer(photo, context={"request": request}).data,
            message="Profile photo approved successfully.",
        )


class AdminProfilePhotoRejectView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (JSONParser,)

    def post(self, request, photo_id):
        reviewer = _require_photo_reviewer(request, photo_id, action="reject")
        try:
            photo = review_profile_photo(
                photo_id=photo_id,
                reviewer=reviewer,
                approve=False,
                reason=str(request.data.get("reason", "")),
            )
        except ProfilePhoto.DoesNotExist as exc:
            raise Http404("Profile photo not found.") from exc
        except ProfilePhotoProcessingError as exc:
            return _error_response(exc, field="reason")
        return ApiResponse(
            data=ProfilePhotoSerializer(photo, context={"request": request}).data,
            message="Profile photo rejected successfully.",
        )


# Backwards-compatible class names and paths used while the Next app migrates.
class ProfilePhotoUploadView(ProfilePhotoCollectionView):
    pass


class ProfilePhotoListView(ProfilePhotoMineView):
    pass


class ProfilePhotoDeleteView(ProfilePhotoDetailView):
    pass
