from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from database import db
from auth import auth

from attendance import attendance
from qr import qr


def create_app():
    app = Flask(__name__)

    BASE_DIR = Path(__file__).resolve().parent.parent

    DATABASE_DIR = BASE_DIR / "database"
    DATABASE_DIR.mkdir(exist_ok=True)

    DATABASE_PATH = DATABASE_DIR / "database.db"

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"sqlite:///{DATABASE_PATH.as_posix()}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT configuration
    app.config["JWT_SECRET_KEY"] = "change-this-later"

    db.init_app(app)
    CORS(app)
    JWTManager(app)

    app.register_blueprint(auth, url_prefix="/api/auth")
    app.register_blueprint(attendance, url_prefix="/api/attendance")
    app.register_blueprint(qr, url_prefix="/api/qr")

    with app.app_context():
        from models import User, Student, Subject, ClassSession, Attendance
        db.create_all()

    @app.route("/")
    def home():
        return jsonify({
            "message": "AttendEase backend is running"
        })

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)