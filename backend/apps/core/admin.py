from django.contrib import admin

from .models import (
    BackupRecord,
    Complaint,
    ContactEnquiry,
    Payment,
    PlatformSetting,
    ProfileReport,
    ProfileVerificationRequest,
    SupportCategory,
    SupportTicket,
    SupportTicketReply,
)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'subject', 'priority', 'status', 'current_assignee', 'created_at')
    list_filter = ('priority', 'status', 'category')
    search_fields = ('ticket_number', 'subject', 'member__email', 'current_assignee__email')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'member', 'amount', 'currency', 'status', 'gateway_reference')
    list_filter = ('status', 'gateway')
    search_fields = ('member__email', 'gateway_reference')


admin.site.register(SupportTicketReply)
admin.site.register(SupportCategory)
admin.site.register(ProfileVerificationRequest)
admin.site.register(ContactEnquiry)
admin.site.register(Complaint)
admin.site.register(ProfileReport)
admin.site.register(PlatformSetting)
admin.site.register(BackupRecord)
