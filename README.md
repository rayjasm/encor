# Encor

<img width="1355" alt="Encor のカレンダー画面" src="https://github.com/user-attachments/assets/6d734645-1b37-460b-977c-bfa2b1ebfa35" />

Encor は、自分の予定を友人に公開し、空いている日に「予約リクエスト」を受け付けるためのカレンダーアプリです。
飲食店やホテルのリクエスト予約のように、友人が希望日時を送り、本人が承諾すると予定として確定します。

## できること

### 本人(ログインユーザー)

- マイページのカレンダーで予定を登録・編集・削除できます。
- 予定ごとに **公開 / 非公開** を選べます。非公開の予定は自分にしか見えず、公開カレンダーには表示されません。
- 「カレンダーを共有」ボタンで、自分専用の公開カレンダー URL をコピーして友人に渡せます。
- 届いた予約リクエストがマイページのカレンダーに点線枠で表示されます。
- リクエストをクリックして **承諾** または **辞退** を選べます。承諾すると予定として確定し、そのときに公開 / 非公開も選べます。

### 友人(ログイン不要)

- 共有された URL を開くと、本人の公開予定を閲覧できます。
- 空いている日をクリックし、名前・希望日時・連絡先・コメントを入力して予約リクエストを送れます。

## 予定の表示範囲と保存期間

カレンダーに表示できるのは **今日を基準に前後1年間** です。
それより前や後の日付は、マイページ・公開カレンダーのどちらでも表示・選択できません。
予定は長期の記録ではなく、直近の約束を共有することを目的にしています。

表示期間を過ぎたデータはサーバー側でも削除されます。
**今日から1年前より前に終了した予定と予約リクエスト** が削除対象で、承諾・辞退済みのリクエストも含みます。
削除はカレンダーが読み込まれたタイミングで自動的に実行されます(1時間に1回まで)。
手動で実行する場合は次のコマンドを使います。

```bash
# 削除対象の件数だけ確認する
docker-compose exec django poetry run python manage.py delete_expired --dry-run

# 削除を実行する
docker-compose exec django poetry run python manage.py delete_expired
```

## 画面と URL

| 画面 | URL | ログイン |
|---|---|---|
| トップ | `/` | 不要 |
| ユーザー登録 | `/signup/` | 不要 |
| サインイン | `/signin/` | 不要 |
| マイページ(自分のカレンダー) | `/mypage/` | 必要 |
| 公開カレンダー(予約リクエスト受付) | `/users/<ユーザーID>/` | 不要 |
| 管理画面 | `/admin/` | 管理者のみ |

## 技術構成

- Python 3.11 / Django 4.2
- MySQL 8.0
- FullCalendar 5(カレンダー表示)、axios(API 通信)
- Poetry(依存管理)、Docker Compose(開発環境)

## 開発環境の起動

```bash
# 1. イメージをビルドして起動
docker-compose build
docker-compose up -d

# 2. データベースを初期化
docker-compose exec django poetry run python manage.py migrate

# 3. 管理者ユーザーを作成
docker-compose exec django poetry run python manage.py createsuperuser
```

起動後、ブラウザで http://localhost:8000/ を開きます。

初回起動時は MySQL の初期化が終わる前に Django が立ち上がり、DB 接続エラーで止まることがあります。
その場合は Django コンテナだけ再起動してください。

```bash
docker-compose restart django
```

### その他のコマンド

```bash
# テストを実行
docker-compose exec django poetry run python manage.py test

# モデルを変更したときにマイグレーションを作成
docker-compose exec django poetry run python manage.py makemigrations

# 静的ファイルを集約
docker-compose exec django poetry run python manage.py collectstatic

# コンテナに入る
docker-compose exec django bash
```
