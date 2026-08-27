# AttendEase — College Attendance System

AttendEase is a modern, digital college attendance tracking platform built for college classrooms and hackathon demos. Faculty can start an attendance session that displays a dynamic, rotating QR code with short-lived expiration tokens, students scan the QR using their smartphones over the local Wi-Fi network, and the backend verifies the student's authentication and records verified attendance in real time.

---

## 🌟 Key Features

- **Role-Based Authentication**: Separate secure login portals for Faculty and Students with JWT tokens.
- **Faculty Session Control**: Select assigned subjects, launch attendance sessions, and monitor incoming check-ins in real time.
- **Dynamic Rotating QR Codes**: Secure, short-lived tokens (15-second lifespan) automatically rotate to prevent replay attacks and proxy attendance.
- **Student Mobile Scanner**: Responsive QR scanner utilizing HTML5 Camera APIs with a built-in testing code entry fallback.
- **Real-Time Live Monitor**: Faculty dashboard dynamically updates as students mark attendance.
- **Duplicate Attendance Prevention**: Database-level and API-level checks prevent students from marking attendance multiple times in the same session.
- **Session Lifecycle & History**: Ending a session computes a final attendance summary while permanently storing attendance records.
- **Local Network Support**: Designed to run seamlessly across devices on local Wi-Fi (e.g. `192.168.1.147`).

---

## 🏗️ System Architecture

```
[ Faculty Laptop (Browser) ]       [ Student Phone (Browser) ]
         │                                       │
         ▼                                       ▼
  React Frontend                          React Frontend
  (Port 5173 / HTTPS)                     (Port 5173 / HTTPS)
         │                                       │
         └───────────────┬───────────────────────┘
                         │
                         ▼
               [ Vite Reverse Proxy ]
                         │
                         ▼
               [ Flask REST Backend ]
               (Port 5000 / SQLite)
                         │
                         ▼
               [ SQLite Database ]
               (Users, Sessions, Attendance)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites

- **Python 3.10+** installed
- **Node.js 18+** & **npm** installed

### 2. Backend Setup

Open a terminal in the project directory:

```bash
cd backend
pip install -r requirements.txt
python app.py
```
*The backend server will start on `http://0.0.0.0:5000`.*

### 3. Frontend Setup

Open a second terminal in the project directory:

```bash
cd frontend
npm install
npm run dev -- --host
```
*The frontend development server will start on `https://0.0.0.0:5173`.*

### 4. Optional: Desktop Control Panel

On Windows, you can double-click `run_control_panel.bat` or run:

```bash
python control_panel.py
```
This launches a GUI dashboard that allows you to start backend/frontend servers, open browser links, and manage sessions with one click.

---

## 📱 Local Network & Phone Access

To scan QR codes from a mobile device on the same Wi-Fi network:

1. **Find Laptop LAN IP**: Current development IP is `192.168.1.147`.
2. **Open on Phone**: Navigate to `https://192.168.1.147:5173` in your mobile browser (Safari/Chrome).
3. **Accept Self-Signed Certificate**: If prompted about a self-signed certificate, tap **Advanced** -> **Proceed to site** (required for mobile camera permission).
4. **Log in as Student**: Use the student credentials below to test the scanner.

---

## 🔑 Default Test Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Faculty** | `faculty@test.com` | `123456` | Professor Anderson |
| **Student** | `student@test.com` | `123456` | Alex Johnson (`CS2024-042`) |

---

## 📡 API Contract Reference

### Authentication
- `POST /api/auth/login` — Authenticate user and receive JWT access token.
- `POST /api/auth/register` — Register a new student or faculty account.

### Attendance Management (Faculty)
- `GET /api/attendance/subjects` — List all subjects.
- `POST /api/attendance/subjects` — Create a new subject code.
- `POST /api/attendance/sessions` — Start an active attendance session.
- `DELETE /api/attendance/sessions/<id>` — End an active attendance session.
- `GET /api/attendance/sessions/<id>/records` — Retrieve live/final attendance records.

### Dynamic QR System
- `GET /api/qr/sessions/<id>/qr` — Generate or fetch the current 15-second QR token.

### Student Attendance
- `POST /api/attendance/mark` — Validate QR token and record student attendance.
- `GET /api/attendance/history` — Get student's personal attendance history.

---

## 🧪 Testing

To run the automated backend test suite:

```bash
cd backend
python -c "import test_app; unittest.main(module='test_app')"
```
*All 15 end-to-end scenarios test authentication, session creation, duplicate prevention, QR rotation, QR expiration, attendance recording, and multi-session isolation.*
