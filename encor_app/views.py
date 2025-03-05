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

# モデルとフォーム
from .models import Plan, Offer
from .forms import PlanForm, SignupForm, OfferForm

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
        
        events = Plan.objects.filter(user=request.user)
        
        plans_list = []
        for event in events:
            plans_list.append(
                {
                    "id": event.id,
                    "start": event.open_date.isoformat(),
                    "end": event.close_date.isoformat(),
                    "title": event.title,
                    "color": event.color,
                    "location": event.location,
                    "message": event.message,
                }
            )
        return JsonResponse({'events': plans_list})
    
    # 新規登録
    elif request.method == "POST":
        datas = json.loads(request.body)
        start = datas["start"]
        end = datas["end"]
        title = datas["title"]
        color = datas["color"]
        location = datas["location"]
        message = datas["message"]

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
    events = Plan.objects.filter(user=user)

    plans_list = []
    for event in events:
        plans_list.append(
            {
                "id" : event.id,
                "start": event.open_date.isoformat(),
                "end": event.close_date.isoformat(),
                "title": event.title,
                "color": event.color,
                "location": event.location,
                "message": event.message,
            }
        )
    return JsonResponse({'events': plans_list})

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