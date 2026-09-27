from datetime import datetime, timedelta, timezone
import secrets

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from database import db
from models import (
    User,
    FacultyProfile,
    Subject,
    ClassSession,
    Attendance,
    Student,
    TimetableSlot,
    FaceProfile,
    now_utc,
)
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash
from zepiris_service import zepiris_service

attendance = Blueprint("attendance", __name__)
faculty_bp = Blueprint("faculty", __name__)


def faculty_only():
    claims = get_jwt()
    return claims.get("role") == "faculty"


# ============================================================
# SUBJECTS
# ============================================================

@attendance.route("/subjects", methods=["POST"])
@jwt_required()
def create_subject():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    code = data.get("code", "").strip()

    if not name or not code:
        return jsonify({"error": "Subject name and code are required"}), 400

    existing = Subject.query.filter_by(code=code).first()
    if existing:
        return jsonify({"error": "Subject code already exists"}), 409

    subject = Subject(name=name, code=code)
    db.session.add(subject)
    db.session.commit()

    return jsonify({
        "message": "Subject created successfully",
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code
        }
    }), 201


@attendance.route("/subjects", methods=["GET"])
@jwt_required()
def get_subjects():
    subjects = Subject.query.order_by(Subject.code.asc()).all()

    return jsonify({
        "subjects": [
            {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code
            }
            for subject in subjects
        ]
    }), 200


# ============================================================
# TIMETABLE (REFERENCE / SUGGESTED SCHEDULE)
# ============================================================

@attendance.route("/timetable", methods=["GET"])
@jwt_required()
def get_timetable():
    slots = TimetableSlot.query.all()

    days_order = {
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
        "Saturday": 6,
        "Sunday": 7,
    }

    sorted_slots = sorted(
        slots,
        key=lambda s: (days_order.get(s.day_of_week, 99), s.start_time)
    )

    return jsonify({
        "note": "Reference timetable only. Faculty can start attendance for any subject at any time.",
        "slots": [
            {
                "id": slot.id,
                "day_of_week": slot.day_of_week,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "subject_id": slot.subject_id,
                "subject_name": slot.subject.name if slot.subject else "Unknown",
                "subject_code": slot.subject.code if slot.subject else "N/A"
            }
            for slot in sorted_slots
        ]
    }), 200


# ============================================================
# CREATE ATTENDANCE SESSION (FACULTY ONLY)
# ============================================================

@attendance.route("/sessions", methods=["POST"])
@jwt_required()
def create_session():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}
    subject_id = data.get("subject_id")

    if not subject_id:
        return jsonify({"error": "subject_id is required"}), 400

    try:
        subject_id = int(subject_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid subject_id"}), 400

    subject = db.session.get(Subject, subject_id)
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    faculty_id = int(get_jwt_identity())

    # Prevent the same faculty from running multiple active sessions simultaneously
    existing_session = ClassSession.query.filter_by(
        faculty_id=faculty_id,
        active=True
    ).first()

    if existing_session:
        return jsonify({
            "error": "You already have an active attendance session",
            "session_id": existing_session.id
        }), 409

    # Configurable QR lifetime (default 5s, supports 3, 5, 10, 15)
    qr_lifetime = data.get("qr_lifetime_seconds") or data.get("qr_interval") or 5
    try:
        qr_lifetime = int(qr_lifetime)
        if qr_lifetime not in [3, 5, 10, 15]:
            qr_lifetime = 5
    except (ValueError, TypeError):
        qr_lifetime = 5

    token = secrets.token_urlsafe(24)
    current_time = now_utc()
    expires_at = current_time + timedelta(seconds=qr_lifetime)

    session = ClassSession(
        subject_id=subject.id,
        faculty_id=faculty_id,
        qr_token=token,
        qr_expires_at=expires_at,
        qr_lifetime_seconds=qr_lifetime,
        active=True,
        created_at=current_time,
        ended_at=None
    )

    db.session.add(session)
    db.session.commit()

    return jsonify({
        "message": "Attendance session created",
        "session": {
            "id": session.id,
            "subject_id": subject.id,
            "subject": subject.name,
            "subject_code": subject.code,
            "active": session.active,
            "qr_lifetime_seconds": session.qr_lifetime_seconds,
            "created_at": current_time.isoformat()
        }
    }), 201


# ============================================================
# END ATTENDANCE SESSION (FACULTY ONLY)
# ============================================================

@attendance.route("/sessions/<int:session_id>", methods=["DELETE"])
@jwt_required()
def end_session(session_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    faculty_id = int(get_jwt_identity())
    session = db.session.get(ClassSession, session_id)

    if not session:
        return jsonify({"error": "Session not found"}), 404

    if session.faculty_id != faculty_id:
        return jsonify({"error": "You do not own this session"}), 403

    session.active = False
    session.qr_token = None
    session.qr_expires_at = None
    session.ended_at = now_utc()

    db.session.commit()

    return jsonify({
        "message": "Attendance session ended",
        "session_id": session.id,
        "ended_at": session.ended_at.isoformat()
    }), 200


# ============================================================
# MANUAL ATTENDANCE OVERRIDE (FACULTY ONLY)
# ============================================================

@attendance.route("/sessions/<int:session_id>/manual-mark", methods=["POST"])
@jwt_required()
def manual_mark_attendance(session_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    faculty_id = int(get_jwt_identity())
    session = db.session.get(ClassSession, session_id)

    if not session:
        return jsonify({"error": "Attendance session not found"}), 404

    if session.faculty_id != faculty_id:
        return jsonify({"error": "You do not own this session"}), 403

    if not session.active:
        return jsonify({"error": "Cannot manually mark attendance for an ended session"}), 400

    data = request.get_json() or {}
    student_id = data.get("student_id")
    roll_number = data.get("roll_number")
    reason = str(data.get("reason", "")).strip() or "Faculty manual override"

    student = None
    if student_id:
        try:
            student = db.session.get(Student, int(student_id))
        except (ValueError, TypeError):
            pass
    elif roll_number:
        student = Student.query.filter_by(roll_number=str(roll_number).strip()).first()

    if not student:
        return jsonify({"error": "Student not found"}), 404

    if student.status != "active":
        return jsonify({"error": "Student account is not active"}), 400

    existing_attendance = Attendance.query.filter_by(
        student_id=student.id,
        class_session_id=session.id
    ).first()

    if existing_attendance:
        return jsonify({"error": "Attendance already marked for this student in this session"}), 409

    current_time = now_utc()
    record = Attendance(
        student_id=student.id,
        class_session_id=session.id,
        timestamp=current_time,
        method="MANUAL",
        verified_by_faculty_id=faculty_id,
        reason=reason,
        confidence_score=None
    )
    db.session.add(record)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Attendance already marked for this student in this session"}), 409

    return jsonify({
        "message": f"Attendance manually marked for {student.user.name} ({student.roll_number})",
        "attendance": {
            "id": record.id,
            "student_id": student.id,
            "student_name": student.user.name,
            "roll_number": student.roll_number,
            "session_id": session.id,
            "subject": session.subject.name,
            "subject_code": session.subject.code,
            "timestamp": current_time.isoformat(),
            "time": current_time.strftime("%I:%M %p"),
            "date": current_time.strftime("%b %d, %Y"),
            "status": "Present",
            "method": "MANUAL",
            "reason": reason
        }
    }), 201


# ============================================================
# GET ATTENDANCE RECORDS FOR A SINGLE SESSION
# ============================================================

@attendance.route("/sessions/<int:session_id>/records", methods=["GET"])
@jwt_required()
def get_session_records(session_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    faculty_id = int(get_jwt_identity())
    session = db.session.get(ClassSession, session_id)

    if not session:
        return jsonify({"error": "Session not found"}), 404

    if session.faculty_id != faculty_id:
        return jsonify({"error": "You do not own this session"}), 403

    records = Attendance.query.filter_by(
        class_session_id=session.id
    ).order_by(
        Attendance.timestamp.asc()
    ).all()

    created_str = session.created_at.isoformat() if session.created_at else None
    ended_str = session.ended_at.isoformat() if session.ended_at else None

    return jsonify({
        "session": {
            "id": session.id,
            "subject": session.subject.name,
            "subject_code": session.subject.code,
            "active": session.active,
            "qr_lifetime_seconds": session.qr_lifetime_seconds if getattr(session, "qr_lifetime_seconds", None) else 5,
            "created_at": created_str,
            "ended_at": ended_str
        },
        "total_present": len(records),
        "records": [
            {
                "attendance_id": record.id,
                "student_id": record.student.id,
                "name": record.student.user.name,
                "roll_number": record.student.roll_number,
                "status": "present",
                "method": record.method if getattr(record, "method", None) else "QR_FACE",
                "reason": record.reason if getattr(record, "reason", None) else None,
                "confidence_score": record.confidence_score if getattr(record, "confidence_score", None) else None,
                "timestamp": record.timestamp.isoformat(),
                "time": record.timestamp.strftime("%I:%M %p")
            }
            for record in records
        ]
    }), 200


# ============================================================
# GET FACULTY SESSIONS HISTORY
# ============================================================

@attendance.route("/sessions/history", methods=["GET"])
@jwt_required()
def get_faculty_sessions_history():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    faculty_id = int(get_jwt_identity())

    sessions = ClassSession.query.filter_by(
        faculty_id=faculty_id
    ).order_by(
        ClassSession.id.desc()
    ).all()

    results = []
    for s in sessions:
        records = Attendance.query.filter_by(class_session_id=s.id).order_by(Attendance.timestamp.asc()).all()

        date_str = s.created_at.strftime("%b %d, %Y") if s.created_at else "—"
        start_str = s.created_at.strftime("%I:%M %p") if s.created_at else "—"
        end_str = s.ended_at.strftime("%I:%M %p") if s.ended_at else ("In Progress" if s.active else "Closed")

        results.append({
            "session_id": s.id,
            "subject": s.subject.name if s.subject else "Unknown Subject",
            "subject_code": s.subject.code if s.subject else "N/A",
            "active": s.active,
            "qr_lifetime_seconds": s.qr_lifetime_seconds if getattr(s, "qr_lifetime_seconds", None) else 5,
            "date": date_str,
            "started": start_str,
            "ended": end_str,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "total_present": len(records),
            "students": [
                {
                    "attendance_id": r.id,
                    "student_id": r.student.id,
                    "student_name": r.student.user.name,
                    "roll_number": r.student.roll_number,
                    "status": "Present",
                    "method": r.method if getattr(r, "method", None) else "QR_FACE",
                    "reason": r.reason if getattr(r, "reason", None) else None,
                    "confidence_score": r.confidence_score if getattr(r, "confidence_score", None) else None,
                    "timestamp": r.timestamp.isoformat(),
                    "time": r.timestamp.strftime("%I:%M %p")
                }
                for r in records
            ]
        })

    return jsonify({
        "sessions": results,
        "total_sessions": len(results)
    }), 200


# ============================================================
# MARK ATTENDANCE (SECURE QR + ZEPIRIS FACE RECOGNITION)
# ============================================================

@attendance.route("/mark", methods=["POST"])
@jwt_required()
def mark_attendance():
    claims = get_jwt()

    # Only students can mark attendance
    if claims.get("role") != "student":
        return jsonify({"error": "Student access required"}), 403

    student_user_id = int(get_jwt_identity())

    # Find the student profile linked to logged-in user
    student = Student.query.filter_by(user_id=student_user_id).first()
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    # Enforce mandatory Face Registration
    if student.status != "active" or not student.face_profile:
        return jsonify({
            "error": "Face registration required before you can mark attendance. Please register your face first."
        }), 403

    # Extract session_id, token, and face_image from request
    session_id = None
    token = None
    face_image = None

    if request.is_json:
        data = request.get_json(silent=True) or {}
        session_id = data.get("session_id")
        token = data.get("token")
        face_image = data.get("face_image") or data.get("image") or data.get("image_base64")
    else:
        session_id = request.form.get("session_id")
        token = request.form.get("token")
        face_image = request.form.get("face_image") or request.form.get("image")
        if not face_image and "file" in request.files:
            face_image = request.files["file"].read()

    if not session_id or not token:
        return jsonify({"error": "session_id and token are required"}), 400

    if not face_image:
        return jsonify({
            "error": "Face image is required for identity verification."
        }), 400

    try:
        session_id = int(session_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid session_id format"}), 400

    # 1. Find attendance session
    session = db.session.get(ClassSession, session_id)
    if not session:
        return jsonify({"error": "Attendance session not found"}), 404

    # 2. Check that session is active
    if not session.active:
        return jsonify({"error": "Attendance session has ended"}), 400

    # 3. Check QR expiration strictly on SERVER TIME
    current_time = now_utc()
    if (
        not session.qr_token
        or not session.qr_expires_at
        or current_time >= session.qr_expires_at
    ):
        return jsonify({"error": "QR code has expired. Please scan the current QR code."}), 400

    # 4. Compare submitted token with current active session token
    if str(token).strip() != str(session.qr_token).strip():
        return jsonify({"error": "Invalid QR token for this session"}), 400

    # 5. Prevent duplicate attendance for the same session
    existing_attendance = Attendance.query.filter_by(
        student_id=student.id,
        class_session_id=session.id
    ).first()

    if existing_attendance:
        return jsonify({"error": "Attendance already marked"}), 409

    # 6. ZEPIRIS FACIAL RECOGNITION IDENTITY VERIFICATION
    try:
        image_rgb = zepiris_service.decode_image(face_image)
    except Exception as e:
        return jsonify({"error": f"Invalid face image format: {str(e)}"}), 400

    # Quality check
    quality_res = zepiris_service.assess_quality(image_rgb)
    if not quality_res.get("passed", True):
        return jsonify({
            "error": "Face verification image quality check failed. Please ensure proper lighting and avoid blur/spoofing.",
            "quality": quality_res
        }), 422

    # Extract live face embedding
    query_embedding, info = zepiris_service.extract_face_embedding(image_rgb)
    if query_embedding is None:
        return jsonify({
            "error": info.get("error", "No face detected during verification. Please center your face in the camera frame.")
        }), 400

    # Load enrolled embedding for the currently authenticated student
    enrolled_embedding = student.face_profile.get_embedding()

    # 1-to-1 Cosine Identity Verification against this student's registered face
    is_match, similarity, threshold = zepiris_service.verify_face_match(
        query_embedding=query_embedding,
        enrolled_embedding=enrolled_embedding,
        threshold=0.50
    )

    if not is_match:
        return jsonify({
            "error": (
                f"Face verification failed: Identity does not match registered student profile. "
                f"(Match: {round(similarity * 100, 1)}%, Required: {round(threshold * 100, 1)}%)"
            ),
            "similarity": round(similarity * 100, 2),
            "threshold": round(threshold * 100, 1)
        }), 401

    # 7. All checks passed -> Record verified attendance
    attendance_record = Attendance(
        student_id=student.id,
        class_session_id=session.id,
        timestamp=current_time,
        method="QR_FACE",
        verified_by_faculty_id=None,
        reason=None,
        confidence_score=round(similarity * 100, 2)
    )

    db.session.add(attendance_record)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Attendance already marked"}), 409

    return jsonify({
        "message": "Attendance marked successfully! Identity verified by Zepiris.",
        "attendance": {
            "id": attendance_record.id,
            "student_id": student.id,
            "student_name": student.user.name,
            "roll_number": student.roll_number,
            "session_id": session.id,
            "subject": session.subject.name,
            "subject_code": session.subject.code,
            "timestamp": current_time.isoformat(),
            "time": current_time.strftime("%I:%M %p"),
            "date": current_time.strftime("%b %d, %Y"),
            "status": "Present",
            "method": "QR_FACE",
            "verification": {
                "matched": True,
                "similarity": round(similarity * 100, 2),
                "zepiris_identity_id": student.zepiris_identity_id,
            }
        }
    }), 201


# ============================================================
# STUDENT ATTENDANCE HISTORY
# ============================================================

@attendance.route("/history", methods=["GET"])
@jwt_required()
def get_student_history():
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "Student access required"}), 403

    student_user_id = int(get_jwt_identity())
    student = Student.query.filter_by(user_id=student_user_id).first()

    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    if student.status != "active":
        return jsonify({"error": "Face registration required to view attendance history"}), 403

    records = Attendance.query.filter_by(
        student_id=student.id
    ).order_by(
        Attendance.timestamp.desc()
    ).all()

    return jsonify({
        "records": [
            {
                "id": f"att-{r.id}",
                "attendance_id": r.id,
                "session_id": r.class_session_id,
                "subject": r.class_session.subject.name if r.class_session and r.class_session.subject else "Class Session",
                "subject_code": r.class_session.subject.code if r.class_session and r.class_session.subject else "N/A",
                "status": "Present",
                "method": r.method if getattr(r, "method", None) else "QR_FACE",
                "reason": r.reason if getattr(r, "reason", None) else None,
                "confidence_score": r.confidence_score if getattr(r, "confidence_score", None) else None,
                "timestamp": r.timestamp.isoformat(),
                "date": r.timestamp.strftime("%b %d, %Y"),
                "time": r.timestamp.strftime("%I:%M %p")
            }
            for r in records
        ],
        "total_attended": len(records)
    }), 200


# ============================================================
# FACULTY ADMIN: AGGREGATE SYSTEM STATS
# ============================================================

@attendance.route("/admin/stats", methods=["GET"])
@faculty_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_admin_stats():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    now = now_utc()
    today_start = datetime(now.year, now.month, now.day)

    total_students = Student.query.count()
    active_students = Student.query.filter_by(status="active").count()
    total_faculty = FacultyProfile.query.count()
    total_subjects = Subject.query.count()
    active_sessions = ClassSession.query.filter_by(active=True).count()
    today_attendance = Attendance.query.filter(Attendance.timestamp >= today_start).count()
    total_attendance = Attendance.query.count()

    # Recent 5 sessions
    recent_sess = ClassSession.query.order_by(ClassSession.id.desc()).limit(5).all()
    recent_sessions_data = []
    for s in recent_sess:
        records_count = Attendance.query.filter_by(class_session_id=s.id).count()
        recent_sessions_data.append({
            "id": s.id,
            "subject": s.subject.name if s.subject else "Unknown",
            "subject_code": s.subject.code if s.subject else "N/A",
            "faculty": s.faculty.name if s.faculty else "Faculty",
            "active": s.active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "time": s.created_at.strftime("%I:%M %p") if s.created_at else "—",
            "date": s.created_at.strftime("%b %d, %Y") if s.created_at else "—",
            "total_present": records_count
        })

    # Recent 8 attendance events
    recent_att = Attendance.query.order_by(Attendance.timestamp.desc()).limit(8).all()
    recent_activity_data = []
    for a in recent_att:
        recent_activity_data.append({
            "id": a.id,
            "student_name": a.student.user.name if a.student and a.student.user else "Student",
            "roll_number": a.student.roll_number if a.student else "—",
            "subject": a.class_session.subject.name if a.class_session and a.class_session.subject else "Class",
            "subject_code": a.class_session.subject.code if a.class_session and a.class_session.subject else "—",
            "method": a.method if getattr(a, "method", None) else "QR_FACE",
            "confidence_score": a.confidence_score if getattr(a, "confidence_score", None) else None,
            "timestamp": a.timestamp.isoformat(),
            "time": a.timestamp.strftime("%I:%M:%S %p")
        })

    return jsonify({
        "total_students": total_students,
        "active_students": active_students,
        "total_faculty": total_faculty,
        "total_subjects": total_subjects,
        "active_sessions": active_sessions,
        "today_attendance": today_attendance,
        "total_attendance": total_attendance,
        "recent_sessions": recent_sessions_data,
        "recent_activity": recent_activity_data
    }), 200


# ============================================================
# FACULTY ADMIN: STUDENT MANAGEMENT
# ============================================================

@attendance.route("/admin/students", methods=["GET"])
@faculty_bp.route("/students", methods=["GET"])
@jwt_required()
def get_admin_students():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    search = request.args.get("search", "").strip().lower()
    query = Student.query.join(User)

    if search:
        query = query.filter(
            (Student.roll_number.ilike(f"%{search}%")) |
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    students = query.order_by(Student.id.desc()).all()
    results = []

    for s in students:
        has_face = bool(s.face_profile is not None)
        att_count = Attendance.query.filter_by(student_id=s.id).count()
        results.append({
            "id": s.id,
            "user_id": s.user_id,
            "name": s.user.name,
            "email": s.user.email,
            "roll_number": s.roll_number,
            "status": s.status,
            "face_registered": has_face,
            "created_at": s.created_at.strftime("%b %d, %Y") if s.created_at else "—",
            "total_attended": att_count
        })

    return jsonify({"students": results, "total": len(results)}), 200


@attendance.route("/admin/students", methods=["POST"])
@faculty_bp.route("/students", methods=["POST"])
@jwt_required()
def create_admin_student():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    roll_number = data.get("roll_number", "").strip().upper()
    password = data.get("password", "") or f"pass_{roll_number}"

    if not name or not email or not roll_number:
        return jsonify({"error": "Name, email, and roll number are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": f"An account with email '{email}' already exists"}), 409

    existing_student = Student.query.filter_by(roll_number=roll_number).first()
    if existing_student:
        return jsonify({"error": f"A student with roll number '{roll_number}' already exists"}), 409

    hashed_pw = generate_password_hash(password)
    user = User(
        name=name,
        email=email,
        password=hashed_pw,
        role="student",
        created_at=now_utc()
    )
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        roll_number=roll_number,
        status="face_registration_pending",
        created_at=now_utc()
    )
    db.session.add(student)
    db.session.commit()

    return jsonify({
        "message": "Student account enrolled successfully",
        "student": {
            "id": student.id,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "roll_number": student.roll_number,
            "status": student.status,
            "face_registered": False,
            "created_at": student.created_at.strftime("%b %d, %Y") if student.created_at else "—",
            "total_attended": 0
        }
    }), 201


@attendance.route("/admin/students/<int:student_id>", methods=["PUT"])
@jwt_required()
def update_admin_student(student_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    roll_number = data.get("roll_number", "").strip().upper()
    status = data.get("status", "").strip()

    if name:
        student.user.name = name

    if email and email != student.user.email:
        conflict = User.query.filter(User.email == email, User.id != student.user.id).first()
        if conflict:
            return jsonify({"error": "Email is already taken by another account"}), 409
        student.user.email = email

    if roll_number and roll_number != student.roll_number:
        conflict = Student.query.filter(Student.roll_number == roll_number, Student.id != student.id).first()
        if conflict:
            return jsonify({"error": "Roll number is already in use"}), 409
        student.roll_number = roll_number

    if status in ["active", "face_registration_pending"]:
        student.status = status

    db.session.commit()

    return jsonify({
        "message": "Student updated successfully",
        "student": {
            "id": student.id,
            "name": student.user.name,
            "email": student.user.email,
            "roll_number": student.roll_number,
            "status": student.status,
            "face_registered": bool(student.face_profile is not None)
        }
    }), 200


@attendance.route("/admin/students/<int:student_id>/reset-face", methods=["POST"])
@jwt_required()
def reset_admin_student_face(student_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    if student.face_profile:
        db.session.delete(student.face_profile)

    student.status = "face_registration_pending"
    student.zepiris_identity_id = None
    db.session.commit()

    return jsonify({
        "message": f"Face registration reset for {student.user.name} ({student.roll_number}). Student will be prompted to register their face on next sign-in.",
        "student_id": student.id,
        "status": student.status
    }), 200


@attendance.route("/admin/students/<int:student_id>", methods=["DELETE"])
@jwt_required()
def delete_admin_student(student_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    user = student.user
    # Delete attendance records
    Attendance.query.filter_by(student_id=student.id).delete()
    if student.face_profile:
        db.session.delete(student.face_profile)

    db.session.delete(student)
    if user:
        db.session.delete(user)

    db.session.commit()
    return jsonify({"message": "Student account removed successfully"}), 200


# ============================================================
# FACULTY ADMIN: FACULTY MANAGEMENT
# ============================================================

@attendance.route("/admin/faculty", methods=["GET"])
@jwt_required()
def get_admin_faculty():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    search = request.args.get("search", "").strip().lower()
    query = FacultyProfile.query.join(User)

    if search:
        query = query.filter(
            (FacultyProfile.faculty_id_code.ilike(f"%{search}%")) |
            (FacultyProfile.department.ilike(f"%{search}%")) |
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    faculty_list = query.order_by(FacultyProfile.id.desc()).all()
    results = []

    for f in faculty_list:
        sess_count = ClassSession.query.filter_by(faculty_id=f.user_id).count()
        results.append({
            "id": f.id,
            "user_id": f.user_id,
            "name": f.user.name,
            "email": f.user.email,
            "faculty_id_code": f.faculty_id_code,
            "department": f.department or "Department of Computer Science",
            "created_at": f.created_at.strftime("%b %d, %Y") if f.created_at else "—",
            "total_sessions": sess_count
        })

    return jsonify({"faculty": results, "total": len(results)}), 200


@attendance.route("/admin/faculty", methods=["POST"])
@jwt_required()
def create_admin_faculty():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    faculty_id_code = data.get("faculty_id", "").strip().upper()
    department = data.get("department", "").strip() or "Department of Computer Science"

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "An account with this email already exists"}), 409

    if not faculty_id_code:
        faculty_id_code = f"FAC{secrets.token_hex(3).upper()}"

    existing_code = FacultyProfile.query.filter_by(faculty_id_code=faculty_id_code).first()
    if existing_code:
        return jsonify({"error": f"Faculty ID '{faculty_id_code}' is already assigned"}), 409

    hashed_pw = generate_password_hash(password)
    user = User(
        name=name,
        email=email,
        password=hashed_pw,
        role="faculty",
        created_at=now_utc()
    )
    db.session.add(user)
    db.session.flush()

    prof = FacultyProfile(
        user_id=user.id,
        faculty_id_code=faculty_id_code,
        department=department,
        created_at=now_utc()
    )
    db.session.add(prof)
    db.session.commit()

    return jsonify({
        "message": "Faculty account created successfully",
        "faculty": {
            "id": prof.id,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "faculty_id_code": prof.faculty_id_code,
            "department": prof.department
        }
    }), 201


@attendance.route("/admin/faculty/<int:faculty_id>", methods=["PUT"])
@jwt_required()
def update_admin_faculty(faculty_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    prof = db.session.get(FacultyProfile, faculty_id)
    if not prof:
        return jsonify({"error": "Faculty member not found"}), 404

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    faculty_id_code = data.get("faculty_id_code", "").strip().upper()
    department = data.get("department", "").strip()
    new_password = data.get("password", "")

    if name:
        prof.user.name = name

    if email and email != prof.user.email:
        conflict = User.query.filter(User.email == email, User.id != prof.user.id).first()
        if conflict:
            return jsonify({"error": "Email is already taken by another account"}), 409
        prof.user.email = email

    if faculty_id_code and faculty_id_code != prof.faculty_id_code:
        conflict = FacultyProfile.query.filter(FacultyProfile.faculty_id_code == faculty_id_code, FacultyProfile.id != prof.id).first()
        if conflict:
            return jsonify({"error": "Faculty ID code is already assigned"}), 409
        prof.faculty_id_code = faculty_id_code

    if department:
        prof.department = department

    if new_password and len(new_password) >= 6:
        prof.user.password = generate_password_hash(new_password)

    db.session.commit()

    return jsonify({
        "message": "Faculty updated successfully",
        "faculty": {
            "id": prof.id,
            "name": prof.user.name,
            "email": prof.user.email,
            "faculty_id_code": prof.faculty_id_code,
            "department": prof.department
        }
    }), 200


@attendance.route("/admin/faculty/<int:faculty_id>", methods=["DELETE"])
@jwt_required()
def delete_admin_faculty(faculty_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    current_user_id = int(get_jwt_identity())
    prof = db.session.get(FacultyProfile, faculty_id)
    if not prof:
        return jsonify({"error": "Faculty member not found"}), 404

    if prof.user_id == current_user_id:
        return jsonify({"error": "Cannot delete your own active administrator account"}), 400

    user = prof.user
    db.session.delete(prof)
    if user:
        db.session.delete(user)

    db.session.commit()
    return jsonify({"message": "Faculty account removed successfully"}), 200


# ============================================================
# FACULTY ADMIN: SUBJECT EDIT & DELETE
# ============================================================

@attendance.route("/subjects/<int:subject_id>", methods=["PUT"])
@jwt_required()
def update_subject(subject_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    subject = db.session.get(Subject, subject_id)
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    code = data.get("code", "").strip().upper()

    if not name or not code:
        return jsonify({"error": "Subject name and code are required"}), 400

    if code != subject.code:
        conflict = Subject.query.filter(Subject.code == code, Subject.id != subject.id).first()
        if conflict:
            return jsonify({"error": "Subject code already exists"}), 409

    subject.name = name
    subject.code = code
    db.session.commit()

    return jsonify({
        "message": "Subject updated successfully",
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code
        }
    }), 200


@attendance.route("/subjects/<int:subject_id>", methods=["DELETE"])
@jwt_required()
def delete_subject(subject_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    subject = db.session.get(Subject, subject_id)
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    active_sess = ClassSession.query.filter_by(subject_id=subject.id, active=True).first()
    if active_sess:
        return jsonify({"error": "Cannot delete a subject with an active attendance session"}), 400

    # Delete timetable slots associated with this subject
    TimetableSlot.query.filter_by(subject_id=subject.id).delete()
    db.session.delete(subject)
    db.session.commit()

    return jsonify({"message": "Subject deleted successfully"}), 200


# ============================================================
# FACULTY ADMIN: ALL ATTENDANCE RECORDS QUERY
# ============================================================

@attendance.route("/records/all", methods=["GET"])
@jwt_required()
def get_all_attendance_records():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    subject_id = request.args.get("subject_id")
    session_id = request.args.get("session_id")
    method = request.args.get("method")
    search = request.args.get("search", "").strip().lower()

    query = Attendance.query.join(Student).join(User)

    if subject_id:
        try:
            query = query.join(ClassSession).filter(ClassSession.subject_id == int(subject_id))
        except (ValueError, TypeError):
            pass

    if session_id:
        try:
            query = query.filter(Attendance.class_session_id == int(session_id))
        except (ValueError, TypeError):
            pass

    if method:
        query = query.filter(Attendance.method == method.upper())

    if search:
        query = query.filter(
            (Student.roll_number.ilike(f"%{search}%")) |
            (User.name.ilike(f"%{search}%"))
        )

    records = query.order_by(Attendance.timestamp.desc()).limit(150).all()
    results = []

    for r in records:
        results.append({
            "id": r.id,
            "student_id": r.student.id,
            "student_name": r.student.user.name,
            "roll_number": r.student.roll_number,
            "session_id": r.class_session_id,
            "subject": r.class_session.subject.name if r.class_session and r.class_session.subject else "Unknown",
            "subject_code": r.class_session.subject.code if r.class_session and r.class_session.subject else "—",
            "timestamp": r.timestamp.isoformat(),
            "time": r.timestamp.strftime("%I:%M:%S %p"),
            "date": r.timestamp.strftime("%b %d, %Y"),
            "status": "Present",
            "method": r.method if getattr(r, "method", None) else "QR_FACE",
            "reason": r.reason if getattr(r, "reason", None) else None,
            "confidence_score": r.confidence_score if getattr(r, "confidence_score", None) else None
        })

    return jsonify({"records": results, "total": len(results)}), 200


# ============================================================
# FACULTY ADMIN: TIMETABLE CRUD
# ============================================================

@attendance.route("/timetable", methods=["POST"])
@jwt_required()
def create_timetable_slot():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}
    day = data.get("day_of_week", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    subject_id = data.get("subject_id")

    if not day or not start_time or not end_time or not subject_id:
        return jsonify({"error": "Day, start time, end time, and subject are required"}), 400

    try:
        subject_id = int(subject_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid subject_id"}), 400

    sub = db.session.get(Subject, subject_id)
    if not sub:
        return jsonify({"error": "Subject not found"}), 404

    slot = TimetableSlot(
        day_of_week=day,
        start_time=start_time,
        end_time=end_time,
        subject_id=sub.id
    )
    db.session.add(slot)
    db.session.commit()

    return jsonify({
        "message": "Timetable slot added successfully",
        "slot": {
            "id": slot.id,
            "day_of_week": slot.day_of_week,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "subject_id": slot.subject_id,
            "subject_name": sub.name,
            "subject_code": sub.code
        }
    }), 201


@attendance.route("/timetable/<int:slot_id>", methods=["PUT"])
@jwt_required()
def update_timetable_slot(slot_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    slot = db.session.get(TimetableSlot, slot_id)
    if not slot:
        return jsonify({"error": "Timetable slot not found"}), 404

    data = request.get_json() or {}
    day = data.get("day_of_week", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    subject_id = data.get("subject_id")

    if day:
        slot.day_of_week = day
    if start_time:
        slot.start_time = start_time
    if end_time:
        slot.end_time = end_time
    if subject_id:
        try:
            sub = db.session.get(Subject, int(subject_id))
            if sub:
                slot.subject_id = sub.id
        except (ValueError, TypeError):
            pass

    db.session.commit()

    return jsonify({
        "message": "Timetable slot updated successfully",
        "slot": {
            "id": slot.id,
            "day_of_week": slot.day_of_week,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "subject_id": slot.subject_id,
            "subject_name": slot.subject.name if slot.subject else "—",
            "subject_code": slot.subject.code if slot.subject else "—"
        }
    }), 200


@attendance.route("/timetable/<int:slot_id>", methods=["DELETE"])
@jwt_required()
def delete_timetable_slot(slot_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    slot = db.session.get(TimetableSlot, slot_id)
    if not slot:
        return jsonify({"error": "Timetable slot not found"}), 404

    db.session.delete(slot)
    db.session.commit()

    return jsonify({"message": "Timetable slot deleted successfully"}), 200


# ============================================================
# STUDENT: PROFILE & DASHBOARD DATA (JWT-BOUND REAL DATA)
# ============================================================

@attendance.route("/student/me", methods=["GET"])
@jwt_required()
def get_student_profile():
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "Student access required"}), 403

    student_user_id = int(get_jwt_identity())
    student = Student.query.filter_by(user_id=student_user_id).first()
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    att_count = Attendance.query.filter_by(student_id=student.id).count()

    return jsonify({
        "student": {
            "id": student.id,
            "user_id": student.user_id,
            "name": student.user.name,
            "email": student.user.email,
            "roll_number": student.roll_number,
            "status": student.status,
            "face_registered": bool(student.face_profile is not None),
            "created_at": student.created_at.strftime("%b %d, %Y") if student.created_at else "—",
            "total_attended": att_count
        }
    }), 200


@attendance.route("/student/dashboard", methods=["GET"])
@jwt_required()
def get_student_dashboard():
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "Student access required"}), 403

    student_user_id = int(get_jwt_identity())
    student = Student.query.filter_by(user_id=student_user_id).first()
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    # Real attendance records for this student
    records = Attendance.query.filter_by(
        student_id=student.id
    ).order_by(Attendance.timestamp.desc()).all()

    recent_records = []
    for r in records[:5]:
        recent_records.append({
            "id": r.id,
            "subject": r.class_session.subject.name if r.class_session and r.class_session.subject else "Class Session",
            "subject_code": r.class_session.subject.code if r.class_session and r.class_session.subject else "—",
            "method": r.method if getattr(r, "method", None) else "QR_FACE",
            "date": r.timestamp.strftime("%b %d, %Y"),
            "time": r.timestamp.strftime("%I:%M %p"),
            "timestamp": r.timestamp.isoformat()
        })

    # Real currently active class sessions
    active_sessions_query = ClassSession.query.filter_by(active=True).all()
    active_sessions_data = []
    for s in active_sessions_query:
        active_sessions_data.append({
            "id": s.id,
            "subject": s.subject.name if s.subject else "Class Session",
            "subject_code": s.subject.code if s.subject else "—",
            "faculty": s.faculty.name if s.faculty else "Faculty",
            "started_at": s.created_at.strftime("%I:%M %p") if s.created_at else "—"
        })

    # Real timetable schedule from DB
    slots = TimetableSlot.query.all()
    timetable_data = []
    for slot in slots:
        timetable_data.append({
            "id": slot.id,
            "day_of_week": slot.day_of_week,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "subject_id": slot.subject_id,
            "subject_name": slot.subject.name if slot.subject else "—",
            "subject_code": slot.subject.code if slot.subject else "—"
        })

    return jsonify({
        "student": {
            "id": student.id,
            "name": student.user.name,
            "email": student.user.email,
            "roll_number": student.roll_number,
            "status": student.status,
            "face_registered": bool(student.face_profile is not None),
            "created_at": student.created_at.strftime("%b %d, %Y") if student.created_at else "—"
        },
        "total_attended": len(records),
        "recent_records": recent_records,
        "active_sessions": active_sessions_data,
        "timetable": timetable_data
    }), 200