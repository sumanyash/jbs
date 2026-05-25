# Server Deployment

This portal does not need `npm install`. It uses only built-in Node.js modules.

## 1. Upload Files

Upload this folder to your server:

```text
job-search-portal/
```

Example server path:

```text
/var/www/job-search-portal
```

## 2. Start Manually

```bash
cd /var/www/job-search-portal
cp .env.example .env
nano .env
PORT=4173 node server.js
```

Open:

```text
http://YOUR_SERVER_IP:4173
```

## 3. Run With systemd

Create:

```text
/etc/systemd/system/job-search-portal.service
```

Service file:

```ini
[Unit]
Description=Yash Job Search Portal
After=network.target

[Service]
WorkingDirectory=/var/www/job-search-portal
Environment=PORT=4173
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable job-search-portal
sudo systemctl start job-search-portal
sudo systemctl status job-search-portal
```

## 4. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name jobs.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Apify Use

- Keep the Apify API key private in `/var/www/job-search-portal/.env`.
- For easiest setup, create Apify tasks first and use Task mode.
- Add your task ID in `.env` as `APIFY_TASK_ID=username~task-name`.
- The portal will hide the API key field when `APIFY_API_KEY` exists on the server.

Example `.env`:

```text
PORT=4173
APIFY_API_KEY=apify_api_your_key_here
DEFAULT_APIFY_MODE=task
APIFY_TASK_ID=username~your-job-scraper-task
DEFAULT_MAX_ITEMS=75
DEFAULT_LOCATION=Remote, India, UAE
DEFAULT_KEYWORDS=AI voice engineer,VoIP engineer,SIP engineer,telecom infrastructure,founding engineer,CPaaS platform engineer,Asterisk engineer,WebRTC engineer
```

After editing `.env`:

```bash
sudo systemctl restart job-search-portal
curl https://job.yjang.online/health
```
