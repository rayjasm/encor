"""
静的ファイルの URL にファイルの更新時刻を付けるテンプレートタグ。

    {% load static_version %}
    <link rel="stylesheet" href="{% static_v 'encor_app/css/style.css' %}">
    → /static/encor_app/css/style.css?v=1760000000

CSS や JS を変更するとクエリ文字列が変わるため、ブラウザのキャッシュに
古いファイルが残っていても確実に新しいものが読み込まれる。
"""
import os

from django import template
from django.contrib.staticfiles import finders
from django.templatetags.static import static

register = template.Library()


@register.simple_tag
def static_v(path):
    url = static(path)
    abs_path = finders.find(path)
    if abs_path and os.path.exists(abs_path):
        return f"{url}?v={int(os.path.getmtime(abs_path))}"
    return url
