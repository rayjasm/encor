# What is Encor ?

<img width="1355" alt="Image" src="https://github.com/user-attachments/assets/6d734645-1b37-460b-977c-bfa2b1ebfa35" />
<br>
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

(4)
```bash
docker-compose build
```

(5)
```bash
docker-compose up -d
```

<br>
<br>
memo for rayjasm :<br>
docker-compose exec django bash<br>
poetry run python manage.py collectstatic<br>
