from datetime import timedelta
import secrets

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from database import db
from models import ClassSession, now_utc


qr = Blueprint("qr", __name__)

QR_DEFAULT_LIFETIME_SECONDS = 5


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
    lifetime = session.qr_lifetime_seconds if getattr(session, "qr_lifetime_seconds", None) else QR_DEFAULT_LIFETIME_SECONDS

    # Generate a new token when the current one has expired.
    if (
        not session.qr_token
        or not session.qr_expires_at
        or current_time >= session.qr_expires_at
    ):
        session.qr_token = secrets.token_urlsafe(24)
        session.qr_expires_at = current_time + timedelta(
            seconds=lifetime
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
        "expires_in": remaining_seconds,
        "lifetime_seconds": lifetime
    }), 200