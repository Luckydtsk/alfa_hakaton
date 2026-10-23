# Сервер

Плейсхолдеры: `SERVER_IP` и `DOMAIN`. Подставьте свои значения. Инструкция для чистого Ubuntu 24.04.

## 1. Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

После `usermod` зайдите на сервер заново, чтобы группа `docker` применилась.

## 2. Файрвол

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Порты Postgres и скоринга в Compose не публикуются.

## 3. Код и настройки

```bash
sudo apt-get install -y git
git clone <URL репозитория> cabinet
cd cabinet
cp .env.example .env
```

В `.env` задайте `POSTGRES_PASSWORD`, `SESSION_SECRET` и при необходимости `FX_RUB_PER_USD`.

## 4. Запуск

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/api/health
```

С другой машины: `http://SERVER_IP:8080`. Войдите как `client.good` / `demo`.

Если 8080 не должен торчать в интернет, в `docker-compose.yml` замените публикацию порта на `127.0.0.1:8080:80` и откройте сайт только через Caddy.

## 5. HTTPS, если есть домен

На хосте:

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```
DOMAIN {
  reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy
```

Без домена достаточно HTTP по `SERVER_IP` и порту 8080.

## 6. Обновление и логи

```bash
git pull
docker compose up -d --build
docker compose logs -f api scoring web
```

Данные Postgres лежат в volume `pgdata` и при обычном обновлении сохраняются.
