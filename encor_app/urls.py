from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path("", views.index, name='index'),
    path("plans/new/", views.plans_new, name='plans_new'),
    path("signup/", views.signup, name='signup'),
    path('signin/', auth_views.LoginView.as_view(template_name='encor_app/signin.html'), name='signin'),  # 一般ユーザー用サインイン
    path("mypage/", views.mypage, name='mypage'),
    path("api/plans/", views.api_plans, name='api_plans'),
    path("users/<int:user_id>/", views.user_calendar, name='user_calendar'),
    path("get/plans/<int:user_id>/", views.get_plans_to_calendar, name='get_plans_to_calendar'),
    path("offers/new/", views.offers_new, name='offers_new'),
    path("api/offers/<int:user_id>/", views.send_offer_user_calendar, name="send_offer_user_calendar"),
]
