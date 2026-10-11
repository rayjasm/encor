import json
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Offer, Plan


class SampleTestCase(TestCase):
    def test_sample(self):
        self.assertEqual(1, 1)


class CalendarTestBase(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pw")
        self.other = User.objects.create_user(username="other", password="pw")
        self.start = timezone.now().replace(microsecond=0) + timedelta(days=1)
        self.end = self.start + timedelta(hours=2)

    def make_offer(self, user=None, **kwargs):
        defaults = dict(
            user=user or self.owner,
            open_date=self.start,
            close_date=self.end,
            name="友人A",
            color="#ff0000",
            contact="090-0000-0000",
            message="遊ぼう",
        )
        defaults.update(kwargs)
        return Offer.objects.create(**defaults)


class PublicCalendarVisibilityTest(CalendarTestBase):
    def test_public_calendar_shows_only_public_plans(self):
        Plan.objects.create(user=self.owner, open_date=self.start, close_date=self.end,
                            title="公開予定", visibility=Plan.VISIBILITY_PUBLIC)
        Plan.objects.create(user=self.owner, open_date=self.start, close_date=self.end,
                            title="内緒の予定", visibility=Plan.VISIBILITY_PRIVATE)

        res = self.client.get(reverse("get_plans_to_calendar", args=[self.owner.id]))
        self.assertEqual(res.status_code, 200)
        titles = [e["title"] for e in res.json()["events"]]
        self.assertEqual(titles, ["公開予定"])

    def test_mypage_api_returns_all_plans_with_visibility(self):
        Plan.objects.create(user=self.owner, open_date=self.start, close_date=self.end,
                            title="内緒の予定", visibility=Plan.VISIBILITY_PRIVATE)
        self.client.login(username="owner", password="pw")
        res = self.client.get(reverse("api_plans"))
        events = res.json()["events"]
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["visibility"], "private")

    def test_create_plan_with_visibility(self):
        self.client.login(username="owner", password="pw")
        payload = {
            "start": self.start.isoformat(), "end": self.end.isoformat(),
            "title": "新規", "color": "#000", "location": "", "message": "",
            "visibility": "private",
        }
        res = self.client.post(reverse("api_plans"), json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        plan = Plan.objects.get(id=res.json()["event_id"])
        self.assertEqual(plan.visibility, Plan.VISIBILITY_PRIVATE)

    def test_update_plan_visibility(self):
        plan = Plan.objects.create(user=self.owner, open_date=self.start, close_date=self.end,
                                   title="予定", visibility=Plan.VISIBILITY_PUBLIC)
        self.client.login(username="owner", password="pw")
        payload = {
            "id": plan.id,
            "start": self.start.isoformat(), "end": self.end.isoformat(),
            "title": "予定", "color": "#000", "location": "", "message": "",
            "visibility": "private",
        }
        res = self.client.put(reverse("api_plans"), json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        plan.refresh_from_db()
        self.assertEqual(plan.visibility, Plan.VISIBILITY_PRIVATE)


class OfferMypageTest(CalendarTestBase):
    def test_offers_api_requires_login(self):
        res = self.client.get(reverse("api_offers"))
        self.assertEqual(res.status_code, 302)

    def test_offers_api_lists_only_my_pending_offers(self):
        mine = self.make_offer()
        self.make_offer(status=Offer.STATUS_ACCEPTED)
        self.make_offer(status=Offer.STATUS_DECLINED)
        self.make_offer(user=self.other)

        self.client.login(username="owner", password="pw")
        res = self.client.get(reverse("api_offers"))
        self.assertEqual(res.status_code, 200)
        offers = res.json()["offers"]
        self.assertEqual([o["id"] for o in offers], [mine.id])
        self.assertEqual(offers[0]["name"], "友人A")
        self.assertEqual(offers[0]["contact"], "090-0000-0000")

    def test_accept_creates_public_plan_by_default(self):
        offer = self.make_offer()
        self.client.login(username="owner", password="pw")
        res = self.client.post(reverse("api_offer_accept", args=[offer.id]))
        self.assertEqual(res.status_code, 200)

        offer.refresh_from_db()
        self.assertEqual(offer.status, Offer.STATUS_ACCEPTED)
        plan = Plan.objects.get(id=res.json()["plan"]["id"])
        self.assertEqual(plan.user, self.owner)
        self.assertEqual(plan.title, "友人A")
        self.assertEqual(plan.open_date, self.start)
        self.assertEqual(plan.close_date, self.end)
        self.assertEqual(plan.message, "遊ぼう")
        self.assertEqual(plan.visibility, Plan.VISIBILITY_PUBLIC)

    def test_accept_with_private_visibility(self):
        offer = self.make_offer()
        self.client.login(username="owner", password="pw")
        res = self.client.post(
            reverse("api_offer_accept", args=[offer.id]),
            json.dumps({"visibility": "private"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        plan = Plan.objects.get(id=res.json()["plan"]["id"])
        self.assertEqual(plan.visibility, Plan.VISIBILITY_PRIVATE)
        # 非公開なので公開カレンダーには出ない
        public = self.client.get(reverse("get_plans_to_calendar", args=[self.owner.id])).json()
        self.assertEqual(public["events"], [])

    def test_decline_marks_offer_without_creating_plan(self):
        offer = self.make_offer()
        self.client.login(username="owner", password="pw")
        res = self.client.post(reverse("api_offer_decline", args=[offer.id]))
        self.assertEqual(res.status_code, 200)
        offer.refresh_from_db()
        self.assertEqual(offer.status, Offer.STATUS_DECLINED)
        self.assertEqual(Plan.objects.count(), 0)

    def test_cannot_answer_someone_elses_offer(self):
        offer = self.make_offer(user=self.other)
        self.client.login(username="owner", password="pw")
        self.assertEqual(self.client.post(reverse("api_offer_accept", args=[offer.id])).status_code, 404)
        self.assertEqual(self.client.post(reverse("api_offer_decline", args=[offer.id])).status_code, 404)
        offer.refresh_from_db()
        self.assertEqual(offer.status, Offer.STATUS_PENDING)

    def test_cannot_answer_twice(self):
        offer = self.make_offer()
        self.client.login(username="owner", password="pw")
        self.client.post(reverse("api_offer_accept", args=[offer.id]))
        res = self.client.post(reverse("api_offer_decline", args=[offer.id]))
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Plan.objects.count(), 1)

    def test_accept_requires_post(self):
        offer = self.make_offer()
        self.client.login(username="owner", password="pw")
        self.assertEqual(self.client.get(reverse("api_offer_accept", args=[offer.id])).status_code, 405)

