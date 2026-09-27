import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

from database import db
from models import User, Student, FacultyProfile, FaceProfile, now_utc

auth = Blueprint("auth", __name__)


@auth.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    role = data.get("role", "").strip().lower()

    if not name or not email or not password or not role:
        return jsonify({"error": "Name, email, password, and role are required"}), 400

    if role not in ["student", "faculty"]:
        return jsonify({"error": "Role must be 'student' or 'faculty'"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    if confirm_password and password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    # Ensure unique email
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "An account with this email already exists"}), 409

    hashed_password = generate_password_hash(password)

    user = User(
        name=name,
        email=email,
        password=hashed_password,
        role=role,
        created_at=now_utc()
    )
    db.session.add(user)
    db.session.flush()

    roll_number = None
    faculty_id_code = None
    status = "active"
    requires_face_registration = False

    if role == "student":
        # Handle student profile
        raw_roll = data.get("roll_number", "").strip().upper()
        if raw_roll:
            existing_roll = Student.query.filter_by(roll_number=raw_roll).first()
            if existing_roll:
                db.session.rollback()
                return jsonify({"error": f"Roll number '{raw_roll}' is already in use"}), 409
            roll_number = raw_roll
        else:
            # Auto-generate unique student ID / roll number
            roll_number = f"STU{user.id:04d}"
            while Student.query.filter_by(roll_number=roll_number).first():
                roll_number = f"STU{user.id:04d}-{secrets.token_hex(2).upper()}"

        status = "face_registration_pending"
        requires_face_registration = True

        student = Student(
            user_id=user.id,
            roll_number=roll_number,
            status=status,
            zepiris_identity_id=None,
            created_at=now_utc()
        )
        db.session.add(student)

    elif role == "faculty":
        # Handle faculty profile
        raw_fac_id = data.get("faculty_id", "").strip().upper()
        department = data.get("department", "").strip() or None

        if raw_fac_id:
            existing_fac = FacultyProfile.query.filter_by(faculty_id_code=raw_fac_id).first()
            if existing_fac:
                db.session.rollback()
                return jsonify({"error": f"Faculty ID '{raw_fac_id}' is already in use"}), 409
            faculty_id_code = raw_fac_id
        else:
            faculty_id_code = f"FAC{user.id:04d}"
            while FacultyProfile.query.filter_by(faculty_id_code=faculty_id_code).first():
                faculty_id_code = f"FAC{user.id:04d}-{secrets.token_hex(2).upper()}"

        faculty_prof = FacultyProfile(
            user_id=user.id,
            faculty_id_code=faculty_id_code,
            department=department,
            created_at=now_utc()
        )
        db.session.add(faculty_prof)

    db.session.commit()

    # Issue JWT access token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "name": user.name,
            "email": user.email,
        }
    )

    return jsonify({
        "message": "Account created successfully",
        "access_token": access_token,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": status,
        "requires_face_registration": requires_face_registration,
        "roll_number": roll_number,
        "faculty_id": faculty_id_code,
    }), 201


@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    identifier = (
        data.get("identifier")
        or data.get("roll_number")
        or data.get("email")
        or ""
    ).strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Roll number / Email and password are required"}), 400

    user = None

    # 1. Try finding student by roll number
    student = Student.query.filter(Student.roll_number.ilike(identifier)).first()
    if student:
        user = student.user

    # 2. If not student, try finding faculty by faculty_id_code
    if not user:
        fac = FacultyProfile.query.filter(FacultyProfile.faculty_id_code.ilike(identifier)).first()
        if fac:
            user = fac.user

    # 3. If not found by roll/code, try finding user by email
    if not user:
        user = User.query.filter(User.email.ilike(identifier)).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials. Please check your roll number/email and password."}), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "name": user.name,
            "email": user.email,
        }
    )

    roll_number = None
    faculty_id_code = None
    status = "active"
    requires_face_registration = False

    if user.role == "student":
        stu = Student.query.filter_by(user_id=user.id).first()
        if stu:
            roll_number = stu.roll_number
            status = stu.status
            has_profile = bool(stu.face_profile is not None)
            if status != "active" or not has_profile:
                status = "face_registration_pending"
                requires_face_registration = True
        else:
            status = "face_registration_pending"
            requires_face_registration = True
    elif user.role == "faculty":
        fac_prof = FacultyProfile.query.filter_by(user_id=user.id).first()
        faculty_id_code = fac_prof.faculty_id_code if fac_prof else f"FAC{user.id:04d}"
        status = "active"
        requires_face_registration = False

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": status,
        "requires_face_registration": requires_face_registration,
        "roll_number": roll_number,
        "faculty_id": faculty_id_code,
    }), 200


@auth.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    roll_number = None
    faculty_id_code = None
    status = "active"
    requires_face_registration = False
    face_registered = False

    if user.role == "student":
        stu = Student.query.filter_by(user_id=user.id).first()
        if stu:
            roll_number = stu.roll_number
            status = stu.status
            face_registered = bool(stu.face_profile is not None and stu.status == "active")
            requires_face_registration = not face_registered
    elif user.role == "faculty":
        fac = FacultyProfile.query.filter_by(user_id=user.id).first()
        faculty_id_code = fac.faculty_id_code if fac else None

    return jsonify({
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": status,
        "face_registered": face_registered,
        "requires_face_registration": requires_face_registration,
        "roll_number": roll_number,
        "faculty_id": faculty_id_code,
    }), 200