# What is Encor ?

このアプリケーションは、予定をリアルタイムに友人たちに共有でき、無料で、かつ非公開の予定と区別できます。<br>
<br>
Preparation for your computer:<br>

(1)
```bash
docker-compose exec django poetry run python manage.py migrate
```

(2)
```bash
docker-compose exec django poetry run python manage.py makemigrations
```

(3)
```bash
docker-compose exec django poetry run python manage.py createsuperuser
```
<br>
<br>
memo for rayjasm :<br>
docker-compose exec django bash<br>
poetry run python manage.py collectstatic<br>
