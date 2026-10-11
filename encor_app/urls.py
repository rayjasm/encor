from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path("", views.index, name='index'),
    path("plans/new/", views.plans_new, name='plans_new'),
    path("signup/", views.signup, name='signup'),
    path('signin/', auth_views.LoginView.as_view(template_name='encor_app/signin.html'), name='signin'),  # 一般ユーザー用サインイン
    path('signout/', auth_views.LogoutView.as_view(next_page='index'), name='signout'),
    path("mypage/", views.mypage, name='mypage'),
    path("api/plans/", views.api_plans, name='api_plans'),
    path("users/<int:user_id>/", views.user_calendar, name='user_calendar'),
    path("get/plans/<int:user_id>/", views.get_plans_to_calendar, name='get_plans_to_calendar'),
    path("offers/new/", views.offers_new, name='offers_new'),
    path("api/offers/<int:user_id>/", views.send_offer_user_calendar, name="send_offer_user_calendar"),
    # マイページ用: 自分宛てオファーの一覧と回答
    path("api/offers/", views.api_offers, name="api_offers"),
    path("api/offers/<int:offer_id>/accept/", views.api_offer_accept, name="api_offer_accept"),
    path("api/offers/<int:offer_id>/decline/", views.api_offer_decline, name="api_offer_decline"),
]
