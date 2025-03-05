from django.contrib import admin
from django.contrib.auth.models import User
from .models import Plan, Offer

admin.site.register(Plan)
admin.site.register(Offer)

class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff')

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
