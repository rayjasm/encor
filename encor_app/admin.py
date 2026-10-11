from django.contrib import admin
from django.contrib.auth.models import User
from .models import Plan, Offer


class PlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'open_date', 'close_date', 'visibility')
    list_filter = ('visibility',)


class OfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'name', 'open_date', 'close_date', 'contact', 'status', 'request_date')
    list_filter = ('status',)


admin.site.register(Plan, PlanAdmin)
admin.site.register(Offer, OfferAdmin)

class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff')

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
