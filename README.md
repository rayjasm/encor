memo
<br>
models.py 追加後の migrate コマンド<br>
docker-compose exec django poetry run python manage.py makemigrations<br>
docker-compose exec django poetry run python manage.py migrate<br>
<br>
collectstatic の手順<br>
docker-compose exec django bash<br>
poetry run python manage.py collectstatic<br>
