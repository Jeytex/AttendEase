# AttendEase — College Attendance System

AttendEase is a modern, production-ready digital college attendance tracking platform. Faculty can start an attendance session that displays a dynamic, rotating QR code with short-lived expiration tokens (5-second default lifetime, configurable by faculty), students scan the QR on their smartphones over any internet connection, and the backend verifies the student's authentication, server-side token validity, and real-time Zepiris facial biometrics before recording attendance.

---

## 🌟 Key Features

- **Role-Based Authentication**: Separate secure login portals for Faculty and Students with JWT tokens.
- **Faculty Session Control**: Select assigned subjects, launch attendance sessions with configurable QR security rotation intervals (3s, 5s, 10s, 15s), and monitor incoming check-ins in real time.
- **Dynamic Rotating QR Codes**: Secure, short-lived tokens (5-second default lifespan) automatically rotate server-side to prevent replay attacks and proxy attendance.
- **Zepiris Biometric Facial Verification**: Embedded live camera facial recognition (InsightFace ArcFace 512-d embeddings with cosine similarity verification and anti-spoof/quality assessment).
- **Faculty Manual Attendance Override**: Faculty can manually mark a student present with an audit reason in case of camera or device failure.
- **Duplicate Attendance Prevention**: Database-level and API-level checks prevent students from marking attendance multiple times in the same session.
- **Session Lifecycle & History**: Ending a session computes a final attendance summary while permanently storing attendance audit records.
- **Public HTTPS Architecture**: Seamlessly works across any standard public network connection with zero local hotspot or same-Wi-Fi restrictions.

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
- `GET /api/auth/me` — Fetch the currently authenticated user's profile and status.

### Student Biometrics (Zepiris)
- `POST /api/student/face/register` — Enroll a student's 512-d face embedding after quality/liveness checks.
- `GET /api/student/face/status` — Check biometric face registration status for the current student.

### Attendance & Administration (Faculty)
- `GET /api/attendance/subjects` — List all subjects.
- `POST /api/attendance/subjects` — Create a new subject code.
- `POST /api/attendance/sessions` — Start an active attendance session with configurable QR lifetime.
- `DELETE /api/attendance/sessions/<id>` — End an active attendance session.
- `GET /api/attendance/sessions/<id>/records` — Retrieve live/final attendance records.
- `POST /api/attendance/sessions/<id>/manual-mark` — Manually mark a student present with an audit reason.
- `GET /api/attendance/admin/stats` — Retrieve system-wide administration statistics.
- `GET /api/attendance/admin/students` — Search and manage enrolled students.
- `GET /api/attendance/admin/faculty` — Search and manage faculty accounts.

### Dynamic QR System
- `GET /api/qr/sessions/<id>/qr` — Generate or fetch the current rotating QR token (configurable 3s, 5s, 10s, 15s, or 30s lifetime; defaults to 5s).

### Student Attendance
- `POST /api/attendance/mark` — Validate QR token, verify live face biometrics, and record student attendance.
- `GET /api/attendance/history` — Get student's personal attendance history.
- `GET /api/attendance/student/dashboard` — Fetch student dashboard summary, active sessions, and timetable.

---

## 🧪 Testing

To run the automated backend test suite:

```bash
cd backend
python test_suite.py
```
*All 22 production scenarios test authentication, biometric face enrollment, quality/liveness enforcement, dynamic QR rotation, QR expiration, duplicate/concurrent attendance prevention, and faculty manual overrides.*
