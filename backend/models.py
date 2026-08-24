from database import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # student or faculty

    def __repr__(self):
        return f"<User {self.email}>"


class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    roll_number = db.Column(db.String(50), unique=True, nullable=False)

    user = db.relationship("User", backref="student", uselist=False)


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
    active = db.Column(db.Boolean, default=True)

    subject = db.relationship("Subject")
    faculty = db.relationship("User")


class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)
    class_session_id = db.Column(
        db.Integer,
        db.ForeignKey("class_session.id"),
        nullable=False
    )
    timestamp = db.Column(db.DateTime, nullable=False)

    student = db.relationship("Student")
    class_session = db.relationship("ClassSession")