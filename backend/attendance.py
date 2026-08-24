from datetime import datetime, timezone
import secrets

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from database import db
from models import Subject, ClassSession, Attendance, Student


attendance = Blueprint("attendance", __name__)


def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def faculty_only():
    claims = get_jwt()
    return claims.get("role") == "faculty"


@attendance.route("/subjects", methods=["POST"])
@jwt_required()
def create_subject():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}

    name = data.get("name")
    code = data.get("code")

    if not name or not code:
        return jsonify({
            "error": "Subject name and code are required"
        }), 400

    existing = Subject.query.filter_by(code=code).first()

    if existing:
        return jsonify({
            "error": "Subject code already exists"
        }), 409

    subject = Subject(
        name=name,
        code=code
    )

    db.session.add(subject)
    db.session.commit()

    return jsonify({
        "message": "Subject created",
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code
        }
    }), 201


@attendance.route("/subjects", methods=["GET"])
@jwt_required()
def get_subjects():
    subjects = Subject.query.all()

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


@attendance.route("/sessions", methods=["POST"])
@jwt_required()
def create_session():
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    data = request.get_json() or {}

    subject_id = data.get("subject_id")

    if not subject_id:
        return jsonify({
            "error": "subject_id is required"
        }), 400

    subject = db.session.get(Subject, subject_id)

    if not subject:
        return jsonify({
            "error": "Subject not found"
        }), 404

    # Prevent the same faculty from accidentally running multiple
    # active sessions at once.
    faculty_id = int(get_jwt_identity())

    existing_session = ClassSession.query.filter_by(
        faculty_id=faculty_id,
        active=True
    ).first()

    if existing_session:
        return jsonify({
            "error": "You already have an active attendance session",
            "session_id": existing_session.id
        }), 409

    token = secrets.token_urlsafe(24)
    expires_at = now_utc()

    session = ClassSession(
        subject_id=subject.id,
        faculty_id=faculty_id,
        qr_token=token,
        qr_expires_at=expires_at,
        active=True
    )

    db.session.add(session)
    db.session.commit()

    return jsonify({
        "message": "Attendance session created",
        "session": {
            "id": session.id,
            "subject": subject.name,
            "subject_code": subject.code,
            "active": session.active
        }
    }), 201


@attendance.route("/sessions/<int:session_id>", methods=["DELETE"])
@jwt_required()
def end_session(session_id):
    if not faculty_only():
        return jsonify({"error": "Faculty access required"}), 403

    faculty_id = int(get_jwt_identity())

    session = db.session.get(ClassSession, session_id)

    if not session:
        return jsonify({
            "error": "Session not found"
        }), 404

    if session.faculty_id != faculty_id:
        return jsonify({
            "error": "You do not own this session"
        }), 403

    session.active = False
    session.qr_token = None
    session.qr_expires_at = None

    db.session.commit()

    return jsonify({
        "message": "Attendance session ended"
    }), 200


@attendance.route("/mark", methods=["POST"])
@jwt_required()
def mark_attendance():
    claims = get_jwt()

    # Only students can mark attendance.
    if claims.get("role") != "student":
        return jsonify({
            "error": "Student access required"
        }), 403

    student_user_id = int(get_jwt_identity())

    data = request.get_json() or {}

    session_id = data.get("session_id")
    token = data.get("token")

    if not session_id or not token:
        return jsonify({
            "error": "session_id and token are required"
        }), 400

    # Find the student linked to the logged-in user.
    student = Student.query.filter_by(
        user_id=student_user_id
    ).first()

    if not student:
        return jsonify({
            "error": "Student profile not found"
        }), 404

    # Find the attendance session.
    session = db.session.get(ClassSession, session_id)

    if not session:
        return jsonify({
            "error": "Attendance session not found"
        }), 404

    # Make sure the class is still active.
    if not session.active:
        return jsonify({
            "error": "Attendance session has ended"
        }), 400

    current_time = now_utc()

    # Make sure the QR is still valid.
    if (
        not session.qr_token
        or not session.qr_expires_at
        or current_time >= session.qr_expires_at
    ):
        return jsonify({
            "error": "QR code has expired"
        }), 400

    # Compare the submitted token with the current token.
    if token != session.qr_token:
        return jsonify({
            "error": "Invalid QR token"
        }), 400

    # Prevent duplicate attendance.
    existing_attendance = Attendance.query.filter_by(
        student_id=student.id,
        class_session_id=session.id
    ).first()

    if existing_attendance:
        return jsonify({
            "error": "Attendance already marked"
        }), 409

    attendance_record = Attendance(
        student_id=student.id,
        class_session_id=session.id,
        timestamp=current_time
    )

    db.session.add(attendance_record)
    db.session.commit()

    return jsonify({
        "message": "Attendance marked successfully",
        "attendance": {
            "student_id": student.id,
            "session_id": session.id,
            "timestamp": current_time.isoformat(),
            "status": "present"
        }
    }), 201