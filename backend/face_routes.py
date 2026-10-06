"""Biometric face enrollment and status routes for student accounts."""

import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from database import db
from models import Student, FaceProfile, now_utc
from zepiris_service import zepiris_service

face_bp = Blueprint("face", __name__)


@face_bp.route("/register", methods=["POST"])
@jwt_required()
def register_face():
    """Enroll a student's 512-d face embedding after passing quality and liveness checks."""
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "Only student accounts can register a face profile"}), 403

    user_id = int(get_jwt_identity())
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    image_data = None
    if request.is_json:
        data = request.get_json(silent=True) or {}
        image_data = data.get("image") or data.get("image_base64")
    elif "file" in request.files:
        image_data = request.files["file"].read()
    elif "image" in request.form:
        image_data = request.form["image"]

    if not image_data:
        return jsonify({
            "error": "Face image is required. Provide a base64 encoded image or file."
        }), 400

    try:
        image_rgb = zepiris_service.decode_image(image_data)
    except Exception as e:
        return jsonify({"error": f"Invalid image format: {str(e)}"}), 400

    # 1. Image Quality Assessment (blur, spoof, nsfw)
    quality_res = zepiris_service.assess_quality(image_rgb)
    if not quality_res.get("passed", True):
        # Report specific quality failure reason
        reasons = []
        if not quality_res.get("blur", {}).get("is_sharp", True):
            reasons.append("Image is too blurry. Please hold steady.")
        if not quality_res.get("spoof", {}).get("is_live", True):
            reasons.append("Liveness check failed. Please present a real face.")
        if not quality_res.get("nsfw", {}).get("is_safe", True):
            reasons.append("Safety check failed.")

        msg = " ".join(reasons) or "Image quality assessment failed. Please retry with better lighting."
        return jsonify({
            "error": msg,
            "quality": quality_res,
        }), 422

    # 2. Extract 512-d Face Embedding via Zepiris (buffalo_l)
    embedding, info = zepiris_service.extract_face_embedding(image_rgb)
    if embedding is None:
        return jsonify({
            "error": info.get("error", "No face detected in the frame. Please look directly at the camera.")
        }), 400

    # 3. Associate unique Zepiris Identity ID with Student and store embedding
    zepiris_identity_id = f"zepiris_stu_{student.id}_{secrets.token_hex(6)}"

    if student.face_profile:
        student.face_profile.zepiris_identity_id = zepiris_identity_id
        student.face_profile.set_embedding(embedding)
        student.face_profile.updated_at = now_utc()
    else:
        profile = FaceProfile(
            student_id=student.id,
            zepiris_identity_id=zepiris_identity_id,
        )
        profile.set_embedding(embedding)
        db.session.add(profile)

    student.status = "active"
    student.zepiris_identity_id = zepiris_identity_id
    db.session.commit()

    return jsonify({
        "message": "Face successfully registered with Zepiris! Account is now active.",
        "status": "active",
        "zepiris_identity_id": zepiris_identity_id,
        "student": {
            "id": student.id,
            "roll_number": student.roll_number,
            "name": student.user.name,
            "status": student.status,
            "zepiris_identity_id": student.zepiris_identity_id,
        }
    }), 200


@face_bp.route("/status", methods=["GET"])
@jwt_required()
def face_status():
    """Return the biometric enrollment status for the currently authenticated student."""
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "Only student accounts have a face registration status"}), 403

    user_id = int(get_jwt_identity())
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    is_registered = bool(student.status == "active" and student.face_profile)

    return jsonify({
        "student_id": student.id,
        "roll_number": student.roll_number,
        "status": student.status,
        "face_registered": is_registered,
        "zepiris_identity_id": student.zepiris_identity_id,
    }), 200
