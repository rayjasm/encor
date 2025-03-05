# ベースイメージとしてPythonを指定
FROM python:3.11.4

# 作業ディレクトリを設定
WORKDIR /app

# Poetryのインストール
RUN pip install --no-cache-dir poetry==1.8.5

# pyproject.tomlとpoetry.lockをコピー
COPY pyproject.toml poetry.lock ./

# 依存関係をインストール
RUN poetry install

# プロジェクトのソースコードをコピー
COPY . .

# サーバーを起動
CMD ["poetry", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
