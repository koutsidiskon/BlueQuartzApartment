<div align="center">

# 🏖️ Blue Quartz Apartment

### A modern, full-stack apartment rental & booking management platform

[![Angular](https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MariaDB](https://img.shields.io/badge/MariaDB-11.4-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

*A complete, production-ready web application for showcasing and managing short-term apartment rentals — built with security, performance, and a beautiful multi-language guest experience in mind.*

### 🌐 Live

| | |
|---|---|
| **Guest site** | [bluequartzapartment.com](https://bluequartzapartment.com) |
| **Admin panel** | [bluequartzapartment.com/admin/login](https://bluequartzapartment.com/admin/login) |

</div>

---

## ✨ Overview

**Blue Quartz Apartment** is a full-stack web platform designed for independent property owners who want a professional online presence without relying on third-party booking aggregators. Guests can browse the apartment, check real-time availability, and submit booking inquiries — while the owner manages everything through a secure, feature-rich admin dashboard.

### Why This Project?

- **No third-party fees** — own your booking funnel end to end
- **Full booking lifecycle** — from inquiry to confirmed booking, all in one place
- **Calendar sync** — publish bookings to Google Calendar, Apple Calendar, and any iCal-compatible app
- **Multi-channel tracking** — track bookings from Airbnb, Booking.com, WhatsApp, and your own site
- **Multi-language support** — reach guests from across Europe
- **Production-ready** — containerized, rate-limited, reCAPTCHA-protected, and GDPR-aware

---

## 🚀 Features

### For Guests

- 📸 **Immersive gallery** — categorized photos per room with fullscreen lightbox viewer
- 📅 **Live availability calendar** — blocked dates load in real time; minimum stay enforced
- 📝 **Booking inquiry form** — date range selection, guest count, phone with country code, personal message, GDPR consent
- 🌍 **6 languages** — English, Greek, Romanian, Serbian, Bulgarian, Turkish
- 🤖 **Spam protection** — reCAPTCHA v3 + honeypot field, with server-side score verification
- 📱 **Fully responsive** — works great on mobile, tablet, and desktop
- 📧 **Automatic email confirmation** — guests receive a professional HTML confirmation email upon inquiry

### For the Owner / Admin

#### 🗓️ Calendar & Availability
- Visual calendar for blocking and unblocking date ranges (drag-to-select or manual input)
- Real-time overlay of confirmed bookings with color-coded indicators
- **iCal / calendar sync** — generate a token-protected `.ics` feed to subscribe from any calendar app
- **Google Calendar integration** — one-click URL to add the booking feed to Google Calendar
- Automatic date blocking when a new booking is created; automatic unblocking on deletion
- Conflict detection when creating or editing bookings, with optional force-override

#### 📬 Inquiries Management
- Paginated, searchable list of all guest inquiries
- Read / unread status tracking per inquiry
- Expandable message preview per record
- Bulk multi-select delete
- **One-click convert inquiry → booking** — pre-populates guest data automatically

#### 📋 Bookings Management (full CRUD)
- Create, edit, and delete confirmed bookings
- **Multi-source tracking** — Website, Booking.com, Airbnb, Email, WhatsApp, Other
- Guest details: name, email, phone number with country code, notes
- Per-booking color coding for visual calendar distinction
- Paginated list with column sorting (name, email, dates, guest count, source, created)
- Search by guest name or email
- Inline expandable notes per booking

#### 🔐 Security & Access
- JWT-based session stored in HTTP-only cookies
- Rate-limited login
- Route guards — admin panel is inaccessible without an active session
- Admin email notifications on every new inquiry

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Angular 21 (standalone components) |
| **Styling** | SCSS, Material Icons |
| **Date Picker** | Flatpickr (localized per language) |
| **Modals / Alerts** | SweetAlert2 |
| **Image Gallery** | ngx-lightbox + lightgallery |
| **HTTP / Reactivity** | HttpClient, RxJS 7 |
| **Backend Runtime** | Node.js 20 (Alpine) |
| **Backend Framework** | Express.js 5 |
| **ORM** | Sequelize 6 |
| **Database** | MariaDB 11.4 |
| **Authentication** | JWT + bcryptjs |
| **Email** | Resend API + SMTP fallback |
| **Security** | express-rate-limit, reCAPTCHA v3, CORS |
| **Calendar Sync** | RFC 5545 iCal feed generation |
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
│   │   │   │   ├── home/               # Landing page (gallery, availability, contact)
│   │   │   │   ├── facilities/         # Room-by-room photo tour + amenities + house rules
│   │   │   │   ├── check-availability/ # Booking inquiry form with live calendar
│   │   │   │   ├── admin-login/        # Owner authentication page
│   │   │   │   └── admin-panel/        # Dashboard (calendar, inquiries, bookings)
│   │   │   ├── services/               # InquiryService, BookingService,
│   │   │   │                           #   AvailabilityCalendarService, AdminAuthService,
│   │   │   │                           #   ImageService, I18nService…
│   │   │   └── guards/                 # Auth route guard for admin routes
│   │   └── assets/
│   │       └── i18n/                   # Translation JSON files (en, el, ro, sr, bg, tr)
│   └── nginx.conf                      # Nginx SPA routing + reverse proxy config
│
└── backend/                    # Node.js / Express API
    ├── src/
    │   ├── models/             # Sequelize models (AdminUser, Inquiry,
    │   │                       #   Booking, BlockedDate, Image)
    │   ├── routes/             # auth, inquiries, bookings, calendar, images
    │   ├── controllers/        # Business logic per route group
    │   ├── middleware/         # JWT auth, rate limiting, reCAPTCHA
    │   ├── utils/              # Email templates, iCal generator, helpers
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
| `GET` | `/api/inquiries` | ✅ | Paginated, searchable, sortable list of all inquiries |
| `DELETE` | `/api/inquiries` | ✅ | Bulk delete inquiries by ID array |

### Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings` | ✅ | Paginated, searchable, sortable list of all bookings |
| `POST` | `/api/bookings` | ✅ | Create a new booking (with conflict detection) |
| `POST` | `/api/bookings/from-inquiry/:id` | ✅ | Convert an inquiry into a confirmed booking |
| `PUT` | `/api/bookings/:id` | ✅ | Update an existing booking |
| `DELETE` | `/api/bookings/:id` | ✅ | Delete a booking and release its blocked dates |
| `GET` | `/api/bookings/calendar` | ✅ | Fetch bookings for admin calendar overlay |
| `GET` | `/api/bookings/ical` | 🔑 | Public iCal feed (token-authenticated) |
| `GET` | `/api/bookings/ical-url` | ✅ | Retrieve the iCal feed URL |

### Calendar

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/calendar/blocked-dates` | — | Fetch all unavailable dates (manual + bookings) |
| `PUT` | `/api/calendar/blocked-dates` | ✅ | Block or unblock a set of dates |

### Images

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/images` | — | Fetch all gallery images |
| `POST` | `/api/images` | ✅ | Add a new image |

---

## 📅 Calendar Sync & iCal Integration

Blue Quartz generates a fully RFC 5545–compliant **iCal feed** that can be subscribed to from any calendar application.

### What it includes

- Each confirmed booking is published as a calendar event
- Event description contains: guest name, email, phone, guest count, booking source, and notes
- Timezone-aware events (Europe/Athens)
- Events are updated automatically when bookings are edited or deleted

### How to subscribe

1. In the Admin Panel → **Calendar** tab, click **Get iCal URL**
2. Copy the generated URL
3. Add it as a calendar subscription in:
   - **Google Calendar** — *Other calendars → From URL*
   - **Apple Calendar** — *File → New Calendar Subscription*
   - **Outlook** — *Add calendar → Subscribe from web*
   - Any other iCal-compatible app

The feed URL is token-protected — only someone with the link can access it.

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

Language preference is persisted in `localStorage` and applied instantly without a page reload. Date pickers are fully localized per selected language.

---

## 📧 Email Notifications

The platform sends automated HTML emails via **Resend** (with an SMTP fallback) for:

| Trigger | Recipient | Content |
|---|---|---|
| New inquiry submitted | Guest | Personalized confirmation with booking summary, dates, night count |
| New inquiry submitted | Admin | Full inquiry details with direct admin panel link |

Emails use a responsive, table-based HTML template with professional styling.

---

## ⚙️ Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- A [Google reCAPTCHA v3](https://www.google.com/recaptcha/admin) site key & secret
- A [Resend](https://resend.com) API key (or SMTP credentials)

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

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# SMTP fallback (optional)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Bootstrap admin account (created on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password

# CORS allowed origins (comma-separated)
CORS_ORIGINS=https://yourdomain.com
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
| **reCAPTCHA v3** | Server-side score verification on every inquiry submission (threshold: 0.5) |
| **Honeypot Field** | Hidden form field to silently discard bot submissions |
| **CORS** | Strict origin validation — configurable via `CORS_ORIGINS` environment variable |
| **Input Sanitization** | All user inputs validated and sanitized before DB writes |
| **Sort Field Whitelisting** | API sort parameters validated against an explicit allowlist |
| **GDPR Consent** | Explicit checkbox required before inquiry can be submitted |
| **iCal Token Auth** | Public feed URL is token-protected, not guessable |

---

## 📦 Database Models

```
AdminUser     — email (unique), passwordHash, role (owner | family), isActive, lastLoginAt
Inquiry       — fullName, email, phoneCountryCode, phone, checkIn, checkOut,
                guests (1–4), message, isRead, timestamps
Booking       — guestName, guestEmail, guestPhone, guestPhoneCountryCode,
                checkIn, checkOut, guestCount, notes,
                source (Website | Booking.com | Airbnb | Email | WhatsApp | Other),
                inquiryId (FK → Inquiry), color, timestamps
BlockedDate   — date (DATEONLY, unique index), timestamps
Image         — url, category, sortOrder, caption, timestamps
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ☕ and undocumented features by [koutsidiskon](https://koutsidiskon.github.io/)

</div>
