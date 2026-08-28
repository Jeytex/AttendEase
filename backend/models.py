import json
from datetime import datetime, timezone
import numpy as np
from database import db


def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # student or faculty
    created_at = db.Column(db.DateTime, default=now_utc)

    def __repr__(self):
        return f"<User {self.email}>"


class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    roll_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(
        db.String(30),
        default="face_registration_pending",
        nullable=False,
    )  # face_registration_pending | active
    zepiris_identity_id = db.Column(db.String(100), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=now_utc)

    user = db.relationship("User", backref=db.backref("student", uselist=False))
    face_profile = db.relationship(
        "FaceProfile",
        backref=db.backref("student", uselist=False),
        uselist=False,
        cascade="all, delete-orphan",
    )


class FacultyProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    faculty_id_code = db.Column(db.String(50), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=now_utc)

    user = db.relationship("User", backref=db.backref("faculty_profile", uselist=False))


class FaceProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), unique=True, nullable=False)
    zepiris_identity_id = db.Column(db.String(100), unique=True, nullable=False)
    embedding = db.Column(db.Text, nullable=False)  # JSON-encoded 512 float list
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc)

    def get_embedding(self) -> np.ndarray:
        raw_list = json.loads(self.embedding)
        return np.array(raw_list, dtype=np.float32)

    def set_embedding(self, emb: np.ndarray | list[float]) -> None:
        if isinstance(emb, np.ndarray):
            emb = emb.tolist()
        self.embedding = json.dumps(emb)


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)


class ClassSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subject.id"), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    qr_token = db.Column(db.String(255), nullable=True)
    qr_expires_at = db.Column(db.DateTime, nullable=True)
    qr_lifetime_seconds = db.Column(db.Integer, default=5, nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)

    subject = db.relationship("Subject")
    faculty = db.relationship("User")


class Attendance(db.Model):
    __table_args__ = (
        db.UniqueConstraint("student_id", "class_session_id", name="uq_student_class_session"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)
    class_session_id = db.Column(
        db.Integer,
        db.ForeignKey("class_session.id"),
        nullable=False
    )
    timestamp = db.Column(db.DateTime, nullable=False)
    method = db.Column(db.String(20), default="QR_FACE", nullable=False)  # QR_FACE | MANUAL
    verified_by_faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    reason = db.Column(db.String(255), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)

    student = db.relationship("Student")
    class_session = db.relationship("ClassSession")
    verifier = db.relationship("User", foreign_keys=[verified_by_faculty_id])


class TimetableSlot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    day_of_week = db.Column(db.String(20), nullable=False)  # Monday, Tuesday, etc.
    start_time = db.Column(db.String(20), nullable=False)   # e.g., "10:00 AM"
    end_time = db.Column(db.String(20), nullable=False)     # e.g., "11:00 AM"
    subject_id = db.Column(db.Integer, db.ForeignKey("subject.id"), nullable=False)

    subject = db.relationship("Subject")