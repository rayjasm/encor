import json, time
from datetime import datetime
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.template import loader
from django.shortcuts import render, redirect
from django.middleware.csrf import get_token
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.http import require_POST

# モデルとフォーム
from .models import Plan, Offer
from .forms import PlanForm, SignupForm, OfferForm
from .retention import delete_expired_if_due

def index(request):
    current_user = request.user
    return render(request, 'encor_app/index.html', {'user': current_user})

# マイページ
@login_required
def mypage(request):
    get_token(request)
    return render(request, 'encor_app/mypage.html')

# 予定登録フォーム
@login_required
def plans_new(request):
    if request.method == "GET":
        plan_form = PlanForm()
        return render(request, 'encor_app/plans_new.html', {'form': plan_form})
    elif request.method == "POST":
        plan_form = PlanForm(request.POST)
        if plan_form.is_valid():
            plan = plan_form.save(commit=False)
            plan.user = request.user
            plan.save()
            return redirect('plans_new')
        
        return render(request, 'encor_app/plans_new.html', {'form': plan_form})

def plan_to_dict(plan, include_request=False):
    """
    予定を JSON 用の dict にする。
    include_request=True のとき(マイページ向け)は、承諾したリクエストの
    送信者名・連絡先・コメントも含める。公開カレンダーには含めない。
    """
    data = {
        "id": plan.id,
        "start": plan.open_date.isoformat(),
        "end": plan.close_date.isoformat(),
        "title": plan.title,
        "color": plan.color,
        "location": plan.location,
        "message": plan.message,
        "visibility": plan.visibility,
    }
    if include_request:
        offer = plan.offer
        data["request"] = (
            {
                "id": offer.id,
                "name": offer.name,
                "contact": offer.contact,
                "message": offer.message,
                "request_date": offer.request_date.isoformat(),
            }
            if offer is not None
            else None
        )
    return data


def parse_visibility(value):
    """フォームから来た値を Plan.visibility の値に正規化する"""
    if value == Plan.VISIBILITY_PRIVATE:
        return Plan.VISIBILITY_PRIVATE
    return Plan.VISIBILITY_PUBLIC


# CRUD
@login_required
def api_plans(request):
    # 表示
    if request.method == "GET":
        start = request.GET.get("start")
        end = request.GET.get("end")
        title = request.GET.get("title")
        color = request.GET.get("color")
        location = request.GET.get("location")
        message = request.GET.get("message")
        
        delete_expired_if_due()
        events = Plan.objects.filter(user=request.user).select_related("offer")
        return JsonResponse({'events': [plan_to_dict(e, include_request=True) for e in events]})
    
    # 新規登録
    elif request.method == "POST":
        datas = json.loads(request.body)
        start = datas["start"]
        end = datas["end"]
        title = datas["title"]
        color = datas["color"]
        location = datas["location"]
        message = datas["message"]
        visibility = parse_visibility(datas.get("visibility"))

        # ISO 8601形式の文字列をdatetimeオブジェクトに変換
        open_date = datetime.fromisoformat(start)
        close_date = datetime.fromisoformat(end)
            
        event = Plan( 
            user=request.user,   
            open_date=open_date,
            close_date=close_date,
            title=str(title),
            color=str(color),
            location=str(location),
            message=str(message),
            visibility=visibility,
        )
        event.save()
            
        return JsonResponse({
                'id': event.id,
                'status': 'success',
                'message': 'Event created successfully',
                'event_id': event.id
            })
            
    # 更新
    elif request.method == "PUT":
        datas = json.loads(request.body)
        event_id = datas.get('id')
        event = Plan.objects.get(id=event_id, user=request.user)
        
        start = datas['start']
        end = datas['end']
        title = datas['title']
        color = datas['color']
        location = datas['location']
        message = datas['message']
        
        event.open_date = start
        event.close_date = end
        event.title = title
        event.color = color
        event.location = location
        event.message = message
        if "visibility" in datas:
            event.visibility = parse_visibility(datas.get("visibility"))
        
        event.save()
        
        return JsonResponse({
            'id': event.id,
            'status': 'success',
            'message': 'Event updated successfully',
            'event_id': event.id
        })

    # 削除
    elif request.method == "DELETE":
        try:
            event_id = request.GET.get('event_id')
            event = Plan.objects.filter(id=event_id, user=request.user)
            if not event:
                return JsonResponse({'status': 'error', 'message': 'Event not found or permission denied'}, status=404)
            event.delete()
            return JsonResponse({'status': 'success', 'message': 'Event deleted successfully'})
        except Exception as e:
            print(f"Error deleting event: {str(e)}")
            return JsonResponse({'status': 'error', 'id': event_id, 'message': str(e)}, status=500)

# ユーザー登録フォーム
def signup(request):
    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user) # ユーザー登録後自動サインイン
            return redirect('mypage')
    else:
        form = SignupForm()
    
    return render(request, 'encor_app/signup.html', {'form': form})

# リクエスト受付ページの読み込み
def user_calendar(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return render(request, 'encor_app/user_not_found.html')
    return render(request, 'encor_app/user_calendar.html', {'user': user})

# リクエスト受付ページへのplanの表示
def get_plans_to_calendar(request, user_id):
    user = User.objects.get(id=user_id)
    delete_expired_if_due()
    # 公開カレンダーには「公開」の予定だけを表示する
    events = Plan.objects.filter(user=user, visibility=Plan.VISIBILITY_PUBLIC)
    return JsonResponse({'events': [plan_to_dict(e) for e in events]})

# リクエスト送信フォーム
def offers_new(request):
    if request.method == "GET":
        offer_form = OfferForm()
        return render(request, 'encor_app/user_calendar.html', {'form': offer_form})
    elif request.method == "POST":
        offer_form = OfferForm(request.POST)
        if offer_form.is_valid():
            Offer = offer_form.save(commit=False)
            Offer.save()
            return redirect('offers_new')
        
        return render(request, 'encor_app/user_calendar.html', {'form': offer_form})
    
# リクエスト受付ページでの新規登録
def send_offer_user_calendar(request, user_id):
    # 新規登録
    if request.method == "POST":
        try:
            datas = json.loads(request.body)
            start = datas["start"]
            end = datas["end"]
            name = datas["name"]
            color = datas["color"]
            contact = datas["contact"]
            message = datas["message"]

            # ISO 8601形式の文字列をdatetimeオブジェクトに変換
            open_date = datetime.fromisoformat(start)
            close_date = datetime.fromisoformat(end)
        
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'User not found'
                }, status=404)

            offer = Offer( 
                user=user,
                open_date=open_date,
                close_date=close_date,
                name=str(name),
                color=str(color),
                contact=str(contact),
                message=str(message),
            )
            offer.save()

            return JsonResponse({
                    'user_id': offer.user_id,
                    'event_id': offer.id,
                    'status': 'success',
                    'message': 'Event created successfully',
                }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    elif request.method == "GET":
        return JsonResponse({})


# ---- マイページでのオファー確認・回答 ----

def offer_to_dict(offer):
    return {
        "id": offer.id,
        "start": offer.open_date.isoformat(),
        "end": offer.close_date.isoformat(),
        "title": f"【リクエスト】{offer.name}",
        "name": offer.name,
        "color": offer.color,
        "contact": offer.contact,
        "message": offer.message,
        "status": offer.status,
        "request_date": offer.request_date.isoformat(),
    }


# 自分宛ての未回答オファー一覧
@login_required
def api_offers(request):
    delete_expired_if_due()
    # 新着一覧で使うため、受信日時の新しい順に返す
    offers = Offer.objects.filter(
        user=request.user, status=Offer.STATUS_PENDING
    ).order_by("-request_date", "-id")
    return JsonResponse({'offers': [offer_to_dict(o) for o in offers]})


# オファーを承諾して予定として確定する
@login_required
@require_POST
def api_offer_accept(request, offer_id):
    try:
        offer = Offer.objects.get(id=offer_id, user=request.user)
    except Offer.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Offer not found'}, status=404)
    if offer.status != Offer.STATUS_PENDING:
        return JsonResponse({'status': 'error', 'message': 'Offer already answered'}, status=409)

    try:
        datas = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        datas = {}
    visibility = parse_visibility(datas.get("visibility"))

    plan = offer.accept(visibility=visibility)
    return JsonResponse({
        'status': 'success',
        'message': 'Offer accepted',
        'offer_id': offer.id,
        'plan': plan_to_dict(plan, include_request=True),
    })


# オファーを辞退する
@login_required
@require_POST
def api_offer_decline(request, offer_id):
    try:
        offer = Offer.objects.get(id=offer_id, user=request.user)
    except Offer.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Offer not found'}, status=404)
    if offer.status != Offer.STATUS_PENDING:
        return JsonResponse({'status': 'error', 'message': 'Offer already answered'}, status=409)

    offer.decline()
    return JsonResponse({'status': 'success', 'message': 'Offer declined', 'offer_id': offer.id})
