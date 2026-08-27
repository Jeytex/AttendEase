import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from database import db
from auth import auth
from attendance import attendance
from qr import qr
from face_routes import face_bp


def create_app():
    app = Flask(__name__)

    BASE_DIR = Path(__file__).resolve().parent.parent
    DATABASE_DIR = BASE_DIR / "database"
    DATABASE_DIR.mkdir(exist_ok=True)
    DATABASE_PATH = DATABASE_DIR / "database.db"

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT configuration (reads from environment in production, falls back for local dev)
    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY", "attendease-dev-secret-key-change-in-production"
    )

    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*"}})
    JWTManager(app)

    app.register_blueprint(auth, url_prefix="/api/auth")
    app.register_blueprint(attendance, url_prefix="/api/attendance")
    app.register_blueprint(qr, url_prefix="/api/qr")
    app.register_blueprint(face_bp, url_prefix="/api/student/face")

    with app.app_context():
        from models import User, Student, FacultyProfile, FaceProfile, Subject, ClassSession, Attendance, TimetableSlot
        db.create_all()

        # Database column migration helper for existing SQLite databases
        try:
            conn = sqlite3.connect(DATABASE_PATH.as_posix())
            cursor = conn.cursor()

            # 1. class_session columns
            cursor.execute("PRAGMA table_info(class_session);")
            session_cols = [col[1] for col in cursor.fetchall()]
            if "created_at" not in session_cols:
                cursor.execute("ALTER TABLE class_session ADD COLUMN created_at DATETIME;")
            if "ended_at" not in session_cols:
                cursor.execute("ALTER TABLE class_session ADD COLUMN ended_at DATETIME;")

            # 2. student columns
            cursor.execute("PRAGMA table_info(student);")
            student_cols = [col[1] for col in cursor.fetchall()]
            if "status" not in student_cols:
                cursor.execute("ALTER TABLE student ADD COLUMN status VARCHAR(30) DEFAULT 'face_registration_pending';")
            if "zepiris_identity_id" not in student_cols:
                cursor.execute("ALTER TABLE student ADD COLUMN zepiris_identity_id VARCHAR(100);")
            if "created_at" not in student_cols:
                cursor.execute("ALTER TABLE student ADD COLUMN created_at DATETIME;")

            # 3. user columns
            cursor.execute("PRAGMA table_info(user);")
            user_cols = [col[1] for col in cursor.fetchall()]
            if "created_at" not in user_cols:
                cursor.execute("ALTER TABLE user ADD COLUMN created_at DATETIME;")

            conn.commit()
            conn.close()
        except Exception as e:
            print("[Migration note]:", e)

        # Seed required subjects if empty
        REQUIRED_SUBJECTS = [
            ("BS501", "R Programming"),
            ("BS502", "Middleware Technologies"),
            ("BS503", "Software Engineering"),
            ("BS504", "Compiler Design"),
            ("BS505", "Organizational Behaviour"),
            ("BS506", "Operations Research"),
            ("BS507", "R Programming Lab"),
            ("BS508", "Middleware Technologies Lab"),
        ]

        subject_map = {}
        for code, name in REQUIRED_SUBJECTS:
            sub = Subject.query.filter_by(code=code).first()
            if not sub:
                sub = Subject(name=name, code=code)
                db.session.add(sub)
                db.session.flush()
            subject_map[code] = sub

        db.session.commit()

        # Seed reference timetable if empty
        if TimetableSlot.query.count() == 0:
            SAMPLE_TIMETABLE = [
                # Monday
                ("Monday", "09:00 AM", "10:00 AM", "BS501"),
                ("Monday", "10:00 AM", "11:00 AM", "BS502"),
                ("Monday", "11:15 AM", "12:15 PM", "BS503"),
                ("Monday", "01:00 PM", "02:00 PM", "BS504"),
                ("Monday", "02:00 PM", "04:00 PM", "BS507"),
                # Tuesday
                ("Tuesday", "09:00 AM", "10:00 AM", "BS505"),
                ("Tuesday", "10:00 AM", "11:00 AM", "BS506"),
                ("Tuesday", "11:15 AM", "12:15 PM", "BS501"),
                ("Tuesday", "01:00 PM", "02:00 PM", "BS502"),
                ("Tuesday", "02:00 PM", "04:00 PM", "BS508"),
                # Wednesday
                ("Wednesday", "09:00 AM", "10:00 AM", "BS503"),
                ("Wednesday", "10:00 AM", "11:00 AM", "BS504"),
                ("Wednesday", "11:15 AM", "12:15 PM", "BS505"),
                ("Wednesday", "01:00 PM", "02:00 PM", "BS506"),
                ("Wednesday", "02:00 PM", "03:00 PM", "BS501"),
                # Thursday
                ("Thursday", "09:00 AM", "10:00 AM", "BS501"),
                ("Thursday", "10:00 AM", "11:00 AM", "BS502"),
                ("Thursday", "11:15 AM", "12:15 PM", "BS503"),
                ("Thursday", "02:00 PM", "04:00 PM", "BS507"),
                # Friday
                ("Friday", "09:00 AM", "10:00 AM", "BS504"),
                ("Friday", "10:00 AM", "11:00 AM", "BS505"),
                ("Friday", "11:15 AM", "12:15 PM", "BS506"),
                ("Friday", "02:00 PM", "04:00 PM", "BS508"),
            ]

            for day, start_t, end_t, sub_code in SAMPLE_TIMETABLE:
                sub_obj = subject_map.get(sub_code) or Subject.query.filter_by(code=sub_code).first()
                if sub_obj:
                    slot = TimetableSlot(
                        day_of_week=day,
                        start_time=start_t,
                        end_time=end_t,
                        subject_id=sub_obj.id
                    )
                    db.session.add(slot)

            db.session.commit()

    @app.route("/")
    def home():
        return jsonify({
            "message": "AttendEase backend is running with Zepiris Facial Recognition",
            "status": "online",
            "facial_recognition": "Zepiris (InsightFace Buffalo_L)",
        })

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)