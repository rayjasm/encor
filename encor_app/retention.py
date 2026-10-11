"""
表示期間を過ぎた予定・リクエストの削除

カレンダーは「今日を基準に前後1年」しか表示しないため、
その下限(1年前)より前に終了した Plan / Offer はサーバー側でも削除する。
"""
from datetime import datetime, time

from django.core.cache import cache
from django.utils import timezone

from .models import Offer, Plan

# カレンダーの表示範囲(前後何年か)。JS 側の validRange と合わせること
DISPLAY_RANGE_YEARS = 1

# 自動削除を実行する間隔(秒)。カレンダー読み込みのたびに走らせないための抑制
CLEANUP_INTERVAL_SECONDS = 60 * 60
CLEANUP_CACHE_KEY = "encor:expired_cleanup_ran"


def display_range_start(today=None):
    """表示範囲の下限(今日の1年前の 0:00、ローカル時刻)を返す"""
    today = today or timezone.localdate()
    year = today.year - DISPLAY_RANGE_YEARS
    try:
        start = today.replace(year=year)
    except ValueError:
        # 2/29 の1年前は存在しないので 2/28 にする
        start = today.replace(year=year, day=28)
    return timezone.make_aware(datetime.combine(start, time.min))


def expired_plans(cutoff=None):
    cutoff = cutoff or display_range_start()
    return Plan.objects.filter(close_date__lt=cutoff)


def expired_offers(cutoff=None):
    cutoff = cutoff or display_range_start()
    return Offer.objects.filter(close_date__lt=cutoff)


def delete_expired():
    """表示期間を過ぎた予定とリクエストを削除し、(予定件数, リクエスト件数) を返す"""
    cutoff = display_range_start()
    plans_deleted, _ = expired_plans(cutoff).delete()
    offers_deleted, _ = expired_offers(cutoff).delete()
    return plans_deleted, offers_deleted


def delete_expired_if_due():
    """前回の実行から一定時間が経っていれば削除を実行する。実行しなければ None"""
    if cache.add(CLEANUP_CACHE_KEY, 1, CLEANUP_INTERVAL_SECONDS):
        return delete_expired()
    return None
