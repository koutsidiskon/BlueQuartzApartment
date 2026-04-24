# 🚢 Deployment Guide — Blue Quartz Apartment (Contabo VPS)

This guide covers how to build, export, and deploy updated Docker images to the production server running on a linux/amd64 VPS (Contabo).

> **Why cross-build?** The project is developed on Apple Silicon (ARM). The production server runs linux/amd64, so images must be explicitly built for that platform before uploading.

---

## When to Deploy

| What changed | What to upload |
|---|---|
| Frontend code (Angular, SCSS, HTML, i18n) | `frontend_FINAL.tar` |
| Backend code (routes, controllers, services, models) | `backend_FINAL.tar` |
| Both frontend and backend | Both `.tar` files |
| `docker-compose.yml` only | `docker-compose.yml` |
| `.env` only | `.env` |

---

## Step 1 — Commit and push your changes

```bash
git add <changed files>
git commit -m "feat: description of changes"
git push
```

---

## Step 2 — Build Docker images for linux/amd64

Run these commands from the root of the project on your Mac:

**Backend:**
```bash
docker build --platform linux/amd64 -t bluequartzapartment-project-backend:amd64 ./backend
```

**Frontend:**
```bash
docker build --platform linux/amd64 -t bluequartzapartment-project-frontend:amd64 ./frontend
```

> ✅ The first lines of the build output should show `[linux/amd64]` to confirm the correct platform.

---

## Step 3 — Export images as .tar files

```bash
docker save -o backend_FINAL.tar bluequartzapartment-project-backend:amd64
docker save -o frontend_FINAL.tar bluequartzapartment-project-frontend:amd64
```

The `.tar` files are created in the project root. They are excluded from git via `.gitignore`.

---

## Step 4 — Upload files to the server (FileZilla)

Connect to the Contabo server via FileZilla using SFTP and upload the relevant files to the project directory on the server (e.g. `/root/BlueQuartzApartment-project/`):

| File | Upload when |
|---|---|
| `backend_FINAL.tar` | Backend code changed |
| `frontend_FINAL.tar` | Frontend code changed |
| `docker-compose.yml` | Compose file changed |
| `.env` | Environment variables changed |

---

## Step 5 — Connect to the server via SSH

```bash
ssh root@<server-ip>
cd /root/BlueQuartzApartment-project
```

---

## Step 6 — Load the images

```bash
docker load -i backend_FINAL.tar
docker load -i frontend_FINAL.tar
```

Optionally, free up disk space after loading:
```bash
rm backend_FINAL.tar frontend_FINAL.tar
```

---

## Step 7 — Start the containers

```bash
docker compose up -d
```

Verify everything is running:
```bash
docker compose ps
docker compose logs backend --tail=20
```

---

## Server docker-compose.yml

On the server, the `docker-compose.yml` must use `image:` instead of `build:` for the backend and frontend services:

```yaml
services:
  db:
    image: mariadb:11.4
    container_name: bq_mariadb
    restart: always
    env_file: .env
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql

  backend:
    image: bluequartzapartment-project-backend:amd64
    container_name: bq_backend
    restart: always
    env_file: .env
    ports:
      - "3000:3000"
    depends_on:
      - db

  frontend:
    image: bluequartzapartment-project-frontend:amd64
    container_name: bq_frontend
    restart: always
    ports:
      - "4200:80"
    depends_on:
      - backend

volumes:
  mariadb_data:
```

---

## Server .env

The `.env` on the server is separate from your local one. Make sure it has production values:

```env
NODE_ENV=production
CORS_ORIGINS=https://bluequartzapartment.com
```

All other variables (DB credentials, JWT secret, SMTP, Resend API key, reCAPTCHA) should also be set with their production values.

---

## Quick Reference

```
Changed frontend   → build frontend → export .tar → FileZilla → docker load → docker compose up -d
Changed backend    → build backend  → export .tar → FileZilla → docker load → docker compose up -d
Changed both       → build both     → export both → FileZilla → docker load → docker compose up -d
Changed .env only  → FileZilla (.env only)                    →               docker compose up -d
```
