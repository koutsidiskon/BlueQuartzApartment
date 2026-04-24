<div align="center">

# 🏖️ Blue Quartz Apartment

### A modern, full-stack apartment rental & booking platform

[![Angular](https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MariaDB](https://img.shields.io/badge/MariaDB-11.4-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

*A complete, production-ready web application for showcasing and managing short-term apartment rentals — built with security, performance, and a beautiful multi-language guest experience in mind.*

</div>

---

## ✨ Overview

**Blue Quartz Apartment** is a full-stack web platform designed for independent property owners who want a professional online presence without relying on third-party booking aggregators. Guests can browse the apartment, check real-time availability, and submit booking inquiries — while the owner manages everything through a secure admin dashboard.

### Why This Project?

- **No third-party fees** — own your booking funnel end to end
- **Full control over availability** — block dates directly from the admin calendar
- **Multi-language support** — reach guests from across Europe
- **Production-ready** — containerized, rate-limited, reCAPTCHA-protected, and GDPR-aware

---

## 🚀 Features

### For Guests
- 📸 **Immersive gallery** — categorized photos per room with fullscreen lightbox viewer
- 📅 **Live availability calendar** — blocked dates load in real time
- 📝 **Booking inquiry form** — date range selection, guest count, personal message, GDPR consent
- 🌍 **6 languages** — English, Greek, Romanian, Serbian, Bulgarian, Turkish
- 🤖 **Spam protection** — reCAPTCHA v3 + honeypot field
- 📱 **Fully responsive** — works great on mobile, tablet, and desktop

### For the Owner / Admin
- 🔐 **Secure login** — JWT-based session in HTTP-only cookies, rate-limited (5 attempts / 15 min)
- 🗓️ **Calendar management** — visually block or unblock date ranges with Flatpickr
- 📬 **Inquiries dashboard** — paginated list of all guest requests with read/unread status
- 👁️ **Route guards** — admin panel is inaccessible without an active session

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Angular 21 (standalone components) |
| **Styling** | SCSS, Material Icons |
| **Date Picker** | Flatpickr (localized) |
| **Modals / Alerts** | SweetAlert2 |
| **Image Gallery** | ngx-lightbox + lightgallery |
| **HTTP / Reactivity** | HttpClient, RxJS 7 |
| **Backend Runtime** | Node.js 20 (Alpine) |
| **Backend Framework** | Express.js 5 |
| **ORM** | Sequelize 6 |
| **Database** | MariaDB 11.4 |
| **Authentication** | JWT + bcryptjs |
| **Security** | express-rate-limit, reCAPTCHA v3, CORS |
| **Reverse Proxy** | Nginx |
| **Containerization** | Docker & Docker Compose |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
│                                                          │
│  ┌─────────────────┐      ┌──────────────────────────┐  │
│  │  Frontend        │      │  Backend                  │  │
│  │  Nginx + Angular │─────▶│  Node.js / Express        │  │
│  │  :80 / :4200     │      │  :3000                    │  │
│  └─────────────────┘      └────────────┬─────────────┘  │
│                                         │                 │
│                            ┌────────────▼─────────────┐  │
│                            │  MariaDB 11.4             │  │
│                            │  :3306 (persistent vol.)  │  │
│                            └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Nginx handles all incoming traffic — it serves the Angular SPA and proxies `/api/*` requests to the Express backend. The database persists in a named Docker volume, surviving container restarts.

---

## 📁 Project Structure

```
BlueQuartzApartment-project/
├── docker-compose.yml          # Full service orchestration
├── .env.example                # Environment variable template
│
├── frontend/                   # Angular 21 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   │   ├── home/           # Landing page (gallery, availability, contact)
│   │   │   │   ├── facilities/     # Room-by-room photo tour + amenities
│   │   │   │   ├── admin-login/    # Owner authentication page
│   │   │   │   └── admin-panel/    # Dashboard (calendar + inquiries)
│   │   │   ├── services/           # InquiryService, AvailabilityCalendarService,
│   │   │   │                       #   ImageService, AdminAuthService, I18nService…
│   │   │   └── guards/             # Auth route guard for admin routes
│   │   └── assets/
│   │       └── i18n/               # Translation JSON files (en, el, ro, sr, bg, tr)
│   └── nginx.conf                  # Nginx SPA routing + reverse proxy config
│
└── backend/                    # Node.js / Express API
    ├── src/
    │   ├── models/             # Sequelize models (AdminUser, Inquiry,
    │   │                       #   BlockedDate, Image)
    │   ├── routes/             # auth, inquiries, calendar, images
    │   ├── controllers/        # Business logic per route group
    │   ├── middleware/         # JWT auth, rate limiting, reCAPTCHA
    │   └── config/             # DB connection, environment config
    └── Dockerfile
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/auth/login` | — | Login with email & password |
| `GET` | `/api/admin/auth/me` | ✅ | Get current session |
| `POST` | `/api/admin/auth/logout` | ✅ | Destroy session |

### Inquiries

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/inquiries` | — | Submit a booking inquiry (rate-limited + reCAPTCHA) |
| `GET` | `/api/inquiries` | ✅ | Paginated list of all inquiries |

### Calendar

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/calendar/blocked-dates` | — | Fetch all blocked dates |
| `PUT` | `/api/calendar/blocked-dates` | ✅ | Block or unblock a set of dates |

### Images

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/images` | — | Fetch all gallery images |
| `POST` | `/api/images` | ✅ | Add a new image |

---

## 🌍 Supported Languages

| Flag | Language |
|---|---|
| 🇬🇧 | English |
| 🇬🇷 | Greek (Ελληνικά) |
| 🇷🇴 | Romanian (Română) |
| 🇷🇸 | Serbian (Srpski) |
| 🇧🇬 | Bulgarian (Български) |
| 🇹🇷 | Turkish (Türkçe) |

Language preference is persisted in `localStorage` and applied instantly without a page reload.

---

## ⚙️ Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- A [Google reCAPTCHA v3](https://www.google.com/recaptcha/admin) site key & secret

### 1. Clone the repository

```bash
git clone https://github.com/your-username/BlueQuartzApartment-project.git
cd BlueQuartzApartment-project
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# Database
DB_HOST=db
DB_PORT=3306
DB_NAME=bluequartz
DB_USER=your_db_user
DB_PASSWORD=your_db_password
MYSQL_ROOT_PASSWORD=your_root_password

# JWT
JWT_SECRET=your_super_secret_jwt_key

# reCAPTCHA v3
RECAPTCHA_SECRET_KEY=your_recaptcha_secret

# Bootstrap admin account (created on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

### 3. Build and run

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:4200/api |
| Admin Panel | http://localhost:4200/admin/login |

> The database schema is created automatically by Sequelize on first startup, and the bootstrap admin account is seeded from the values in `.env`.

---

## 🚢 Deploying to a VPS (linux/amd64)

Since the project is developed on Apple Silicon (ARM), images must be cross-compiled before uploading to a linux/amd64 server.

**1. Build for linux/amd64:**
```bash
docker build --platform linux/amd64 -t bluequartzapartment-project-backend:amd64 ./backend
docker build --platform linux/amd64 -t bluequartzapartment-project-frontend:amd64 ./frontend
```

**2. Export as .tar:**
```bash
docker save -o backend_FINAL.tar bluequartzapartment-project-backend:amd64
docker save -o frontend_FINAL.tar bluequartzapartment-project-frontend:amd64
```

**3. Upload to server** (via FileZilla/SFTP): `backend_FINAL.tar`, `frontend_FINAL.tar`, `docker-compose.yml`, `.env`

**4. On the server:**
```bash
docker load -i backend_FINAL.tar
docker load -i frontend_FINAL.tar
docker compose up -d
```

> On the server, `docker-compose.yml` should use `image: bluequartzapartment-project-backend:amd64` instead of `build:` context. A detailed step-by-step guide is available locally in `DEPLOY_GUIDE.md` (not tracked by git).

---

## 🖥️ Local Development (without Docker)

**Backend**

```bash
cd backend
npm install
# Make sure a MariaDB instance is running and .env is configured
npm run dev
# API available at http://localhost:3000
```

**Frontend**

```bash
cd frontend
npm install
npm start
# App available at http://localhost:4200
```

> In development mode, Angular's proxy config forwards `/api` requests to `http://localhost:3000`.

---

## 🔒 Security Highlights

| Feature | Details |
|---|---|
| **JWT Authentication** | 8-hour token TTL, stored in HTTP-only cookies (not accessible via JS) |
| **Password Hashing** | bcryptjs with configurable salt rounds |
| **Rate Limiting** | Login: 5 attempts / 15 min · Inquiry submission: 5 requests / 15 min |
| **reCAPTCHA v3** | Server-side score verification on every inquiry submission |
| **Honeypot Field** | Hidden form field to silently discard bot submissions |
| **CORS** | Strict origin validation on all API routes |
| **Input Sanitization** | All user inputs validated and sanitized before DB writes |
| **GDPR Consent** | Explicit checkbox required before inquiry can be submitted |

---

## 📦 Database Models

```
AdminUser       — owner credentials, role (owner | family), login timestamps
Inquiry         — guest requests (name, email, dates, guests, message, isRead)
BlockedDate     — unavailable dates (DATEONLY, unique index)
Image           — gallery photos (url, category, sortOrder, caption)
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ☕ and undocumented features by [koutsidiskon](https://koutsidiskon.github.io/)

</div>
