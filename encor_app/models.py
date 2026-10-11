from django.db import models
from django.contrib.auth.models import User

# 予定テーブル
class Plan(models.Model):
    VISIBILITY_PUBLIC = "public"
    VISIBILITY_PRIVATE = "private"
    VISIBILITY_CHOICES = [
        (VISIBILITY_PUBLIC, "公開"),
        (VISIBILITY_PRIVATE, "非公開"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    open_date = models.DateTimeField(null=False, blank=False)
    close_date = models.DateTimeField(null=False, blank=False)
    title = models.CharField(max_length=15, null=False, blank=False)
    color = models.CharField(max_length=10, null=True, blank=True)
    location = models.CharField(max_length=10, null=True, blank=True)
    message = models.CharField(max_length=30, null=True, blank=True)
    # 公開カレンダーに表示するかどうか
    visibility = models.CharField(
        max_length=10, choices=VISIBILITY_CHOICES, default=VISIBILITY_PUBLIC
    )

    @property
    def is_public(self):
        return self.visibility == self.VISIBILITY_PUBLIC

# リクエストフォーム用テーブル
class Offer(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_DECLINED = "declined"
    STATUS_CHOICES = [
        (STATUS_PENDING, "未回答"),
        (STATUS_ACCEPTED, "承諾"),
        (STATUS_DECLINED, "辞退"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    open_date = models.DateTimeField(null=False, blank=False)
    close_date = models.DateTimeField(null=False, blank=False)
    name = models.CharField(max_length=10, null=False, blank=False)
    color = models.CharField(max_length=10, null=True, blank=True)
    message = models.CharField(max_length=30, null=True, blank=True)    
    contact = models.CharField(max_length=20)
    request_date = models.DateTimeField(auto_now_add=True)
    # 受け取った側の回答状況
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING
    )

    def accept(self, visibility=Plan.VISIBILITY_PUBLIC):
        """オファーを承諾し、予定(Plan)として確定する"""
        plan = Plan.objects.create(
            user=self.user,
            open_date=self.open_date,
            close_date=self.close_date,
            title=self.name,
            color=self.color,
            location="",
            message=self.message,
            visibility=visibility,
        )
        self.status = self.STATUS_ACCEPTED
        self.save(update_fields=["status"])
        return plan

    def decline(self):
        self.status = self.STATUS_DECLINED
        self.save(update_fields=["status"])
