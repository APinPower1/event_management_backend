# Event Registration & Capacity Manager

A full-stack web application for creating and managing events with real-time seat tracking, registration enforcement, and JWT-based authentication.

Built for Magic Hackathon using FastAPI, SQLAlchemy, SQLite, React, and Tailwind CSS.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Reference](#api-reference)
- [Business Logic](#business-logic)
- [Environment Variables](#environment-variables)
- [Team](#team)

---

## Features

- **Authentication** — Signup and login with JWT tokens. All protected routes require a valid token.
- **Event Management** — Create, view, edit, and cancel events. Only the organizer can edit or cancel their own events.
- **Registration System** — Register for events with real-time seat tracking. Prevents overbooking and duplicate registrations. Cancellations restore seat count automatically.
- **Capacity Enforcement** — Events automatically move to "Sold Out" status when full, and back to "Active" when a registration is cancelled.
- **Filtering & Search** — Filter events by category, availability, and date. Search by event name.
- **Poster Upload** — Upload event posters directly from the create/edit form. Images are stored on the backend and served as URLs.
- **Organizer Dashboard** — Organizers see Edit/Cancel buttons on their own events instead of Register.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| ORM | SQLAlchemy |
| Database | SQLite |
| Auth | JWT via python-jose + passlib/bcrypt |
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| HTTP Client | Axios |
| Routing | React Router v6 |

---

## Project Structure

```
Magic_Hackathon-/
├── event-manager/          # Backend
│   ├── routers/
│   │   ├── auth.py         # Signup, login
│   │   ├── events.py       # Event CRUD + filtering
│   │   └── registrations.py# Register, cancel, view registrants
│   ├── models.py           # SQLAlchemy models (User, Event, Registration)
│   ├── database.py         # DB connection and session
│   ├── main.py             # App entry point, CORS, file upload
│   ├── .env                # Environment variables (not committed)
│   └── pyproject.toml      # Dependencies
│
└── event-frontend/         # Frontend
    └── src/
        ├── components/
        │   ├── Navbar.jsx
        │   └── EventCard.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── SignupPage.jsx
        │   ├── EventsPage.jsx
        │   ├── EventDetailPage.jsx
        │   ├── CreateEventPage.jsx
        │   └── EditEventPage.jsx
        ├── api.js           # Axios instance
        └── App.jsx          # Routes
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- uv (Python package manager) — install with `pip install uv`

---

### Backend Setup

**1. Navigate to the backend folder:**
```bash
cd event-manager
```

**2. Create and activate a virtual environment:**
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux
```

**3. Install dependencies:**
```bash
uv add fastapi uvicorn sqlalchemy python-jose passlib "bcrypt==4.0.1" python-dotenv "pydantic[email]" python-multipart
```

**4. Create a `.env` file in the `event-manager/` folder:**
```
JWT_SECRET=your_long_random_secret_here
```

Generate a secure secret with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**5. Run the server:**
```bash
uvicorn main:app --reload
```

The API will be live at `http://127.0.0.1:8000`
Interactive docs available at `http://127.0.0.1:8000/docs`

---

### Frontend Setup

**1. Navigate to the frontend folder:**
```bash
cd event-frontend
```

**2. Install dependencies:**
```bash
npm install
```

**3. Run the development server:**
```bash
npm run dev
```

The app will be live at `http://localhost:5173`

> Both servers must be running at the same time for the app to work.

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Create a new account |
| POST | `/auth/login` | Login and receive a JWT token |

**Signup request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword",
  "phone": "9876543210"
}
```

**Login response:**
```json
{
  "access_token": "<jwt_token>",
  "token_type": "bearer"
}
```

---

### Events

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/events/` | No | List all events |
| GET | `/events/{id}` | No | Get a single event |
| POST | `/events/` | Yes | Create an event |
| PUT | `/events/{id}` | Yes | Edit an event (organizer only) |
| DELETE | `/events/{id}` | Yes | Cancel an event (organizer only) |

**Query parameters for `GET /events/`:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Search by event title |
| `category` | string | Filter by category |
| `available` | boolean | Show only events with seats remaining |
| `date` | datetime | Show events from this date onwards |

---

### Registrations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/registrations/{event_id}` | Yes | Register for an event |
| DELETE | `/registrations/{event_id}` | Yes | Cancel your registration |
| GET | `/registrations/{event_id}` | Yes | View registrants (organizer only) |

**Registration response:**
```json
{
  "message": "Successfully registered",
  "booking_id": "A1B2C3D4",
  "event": "Magic 5.0",
  "seats_remaining": 9
}
```

---

### File Upload

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload` | Upload an event poster image |

Returns a URL that can be stored as `poster_url` on an event.

---

## Business Logic

The registration system enforces the following rules:

- **No overbooking** — If `seats_remaining == 0`, registration returns `409 Conflict` with the message "Event is fully booked"
- **No duplicates** — A user cannot register for the same event twice. Returns `409 Conflict` with "You are already registered for this event"
- **Seat restoration** — Cancelling a registration increments `seats_remaining` by 1 automatically
- **Auto status updates** — When the last seat is taken, event status changes to `sold_out`. When a cancellation reopens a seat, status reverts to `active`
- **Organizer protection** — Only the user who created an event can edit or cancel it. Others receive `403 Forbidden`
- **Inactive event guard** — Registering for a cancelled event returns `400 Bad Request`

---

## Error Responses

All errors return structured JSON:

```json
{ "detail": "Human-readable error message" }
```

| Status Code | Meaning |
|---|---|
| 400 | Bad request or invalid input |
| 401 | Not authenticated |
| 403 | Not authorized (e.g. not the organizer) |
| 404 | Resource not found |
| 409 | Conflict (full event, duplicate registration) |
| 422 | Validation error (missing or wrong-type fields) |

---

## Environment Variables

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key used to sign JWT tokens. Keep this private and never commit it. |

---

## Team

Built at Magic Hackathon by Team Light_Bulb.
