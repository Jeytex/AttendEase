from datetime import datetime, timedelta, timezone
import secrets

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from database import db
from models import ClassSession


qr = Blueprint("qr", __name__)

QR_LIFETIME_SECONDS = 15


def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@qr.route("/sessions/<int:session_id>/qr", methods=["GET"])
@jwt_required()
def get_current_qr(session_id):
    session = db.session.get(ClassSession, session_id)

    if not session:
        return jsonify({
            "error": "Session not found"
        }), 404

    if not session.active:
        return jsonify({
            "error": "Attendance session is no longer active"
        }), 400

    current_time = now_utc()

    # Generate a new token when the current one has expired.
    if (
        not session.qr_token
        or not session.qr_expires_at
        or current_time >= session.qr_expires_at
    ):
        session.qr_token = secrets.token_urlsafe(24)
        session.qr_expires_at = current_time + timedelta(
            seconds=QR_LIFETIME_SECONDS
        )

        db.session.commit()

    remaining_seconds = max(
        0,
        int((session.qr_expires_at - current_time).total_seconds())
    )

    return jsonify({
        "session_id": session.id,
        "token": session.qr_token,
        "expires_at": session.qr_expires_at.isoformat(),
        "expires_in": remaining_seconds
    }), 200