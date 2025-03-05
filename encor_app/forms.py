from django import forms
from .models import Plan, Offer
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm

# 予定登録のフォーム
class PlanForm(forms.ModelForm):
    class Meta:
        model = Plan
        fields = ['open_date', 'close_date', 'title', 'location', 'message']
        open_date = forms.DateField(label='open_date', widget=forms.DateInput(attrs={'class':'form-control'}))
        close_date = forms.DateField(label='close_date', widget=forms.DateInput(attrs={'class':'form-control'}))
        title = forms.CharField(label='title', widget=forms.TextInput(attrs={'class':'form-control'}))
        location = forms.CharField(label='title', widget=forms.TextInput(attrs={'class':'form-control'}))
        message = forms.CharField(label='title', widget=forms.TextInput(attrs={'class':'form-control'}))
        
# ユーザー登録のフォーム
class SignupForm(UserCreationForm):
    email = forms.EmailField(required=True, help_text='必須')

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user

# リクエストフォーム
class OfferForm(forms.ModelForm):
    class Meta:
        model = Offer
        fields = ['open_date', 'close_date', 'name', 'contact', 'message']
        open_date = forms.DateField(label='open_date', widget=forms.DateInput(attrs={'class':'form-control'}))
        close_date = forms.DateField(label='close_date', widget=forms.DateInput(attrs={'class':'form-control'}))
        name = forms.CharField(label='title', widget=forms.TextInput(attrs={'class':'form-control'}))
        contact = forms.CharField(label='contact', widget=forms.TextInput(attrs={'class':'form-control'}))
        message = forms.CharField(label='title', widget=forms.TextInput(attrs={'class':'form-control'}))
