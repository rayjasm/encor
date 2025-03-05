from django.db import models
from django.contrib.auth.models import User

# 予定テーブル
class Plan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    open_date = models.DateTimeField(null=False, blank=False)
    close_date = models.DateTimeField(null=False, blank=False)
    title = models.CharField(max_length=15, null=False, blank=False)
    color = models.CharField(max_length=10, null=True, blank=True)
    location = models.CharField(max_length=10, null=True, blank=True)
    message = models.CharField(max_length=30, null=True, blank=True)

# リクエストフォーム用テーブル
class Offer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    open_date = models.DateTimeField(null=False, blank=False)
    close_date = models.DateTimeField(null=False, blank=False)
    name = models.CharField(max_length=10, null=False, blank=False)
    color = models.CharField(max_length=10, null=True, blank=True)
    message = models.CharField(max_length=30, null=True, blank=True)    
    contact = models.CharField(max_length=20)
    request_date = models.DateTimeField(auto_now_add=True)