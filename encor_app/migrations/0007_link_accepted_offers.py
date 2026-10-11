from django.db import migrations


def link_accepted_offers(apps, schema_editor):
    """
    この変更より前に承諾されたリクエストは Plan.offer が空なので、
    同じユーザー・日時・名前の予定を探して結び付ける。
    """
    Offer = apps.get_model("encor_app", "Offer")
    Plan = apps.get_model("encor_app", "Plan")
    for offer in Offer.objects.filter(status="accepted", plan__isnull=True):
        plan = (
            Plan.objects.filter(
                user_id=offer.user_id,
                open_date=offer.open_date,
                close_date=offer.close_date,
                title=offer.name,
                offer__isnull=True,
            )
            .order_by("id")
            .first()
        )
        if plan is not None:
            plan.offer = offer
            plan.save(update_fields=["offer"])


class Migration(migrations.Migration):

    dependencies = [
        ("encor_app", "0006_plan_offer"),
    ]

    operations = [
        migrations.RunPython(link_accepted_offers, migrations.RunPython.noop),
    ]
