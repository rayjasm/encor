from django.core.management.base import BaseCommand

from encor_app.retention import (
    delete_expired,
    display_range_start,
    expired_offers,
    expired_plans,
)


class Command(BaseCommand):
    help = "カレンダーの表示期間(今日から1年前)より前に終了した予定とリクエストを削除する"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="削除せずに対象件数だけ表示する",
        )

    def handle(self, *args, **options):
        cutoff = display_range_start()
        self.stdout.write(f"削除基準日時: {cutoff:%Y-%m-%d %H:%M %Z} より前に終了したもの")

        if options["dry_run"]:
            plans = expired_plans(cutoff).count()
            offers = expired_offers(cutoff).count()
            self.stdout.write(f"[dry-run] 予定 {plans} 件、リクエスト {offers} 件が削除対象です")
            return

        plans, offers = delete_expired()
        self.stdout.write(self.style.SUCCESS(f"予定 {plans} 件、リクエスト {offers} 件を削除しました"))
