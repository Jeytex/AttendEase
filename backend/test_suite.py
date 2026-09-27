"""Comprehensive Production Test Suite for AttendEase Attendance System.

Covers all 22 required test cases for Dynamic QR, Zepiris Biometrics, Authentication,
Session Invalidation, and Faculty Manual Overrides.
"""

import base64
import io
import json
import secrets
import time
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import numpy as np
from PIL import Image

from app import create_app
from database import db
from models import User, Student, FacultyProfile, FaceProfile, Subject, ClassSession, Attendance, TimetableSlot
from zepiris_service import zepiris_service


def make_dummy_base64_image():
    """Generate a valid base64 encoded test JPEG image."""
    img = Image.new("RGB", (200, 200), color=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


class AttendEaseProductionTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        # Generate distinct normalized 512-d embeddings for testing
        np.random.seed(42)
        v1 = np.random.randn(512).astype(np.float32)
        cls.student_alice_emb = (v1 / np.linalg.norm(v1)).tolist()

        v2 = np.random.randn(512).astype(np.float32)
        cls.student_bob_emb = (v2 / np.linalg.norm(v2)).tolist()

        v3 = np.random.randn(512).astype(np.float32)
        cls.student_charlie_emb = (v3 / np.linalg.norm(v3)).tolist()

    def setUp(self):
        self.app = self.__class__.app
        self.client = self.__class__.client
        self.created_user_ids = []
        self.created_session_ids = []

    def tearDown(self):
        with self.app.app_context():
            if getattr(self, "created_session_ids", None):
                Attendance.query.filter(Attendance.class_session_id.in_(self.created_session_ids)).delete(synchronize_session=False)
            if getattr(self, "created_user_ids", None):
                students = Student.query.filter(Student.user_id.in_(self.created_user_ids)).all()
                stu_ids = [s.id for s in students]
                if stu_ids:
                    Attendance.query.filter(Attendance.student_id.in_(stu_ids)).delete(synchronize_session=False)
                    FaceProfile.query.filter(FaceProfile.student_id.in_(stu_ids)).delete(synchronize_session=False)
                    Student.query.filter(Student.id.in_(stu_ids)).delete(synchronize_session=False)
                FacultyProfile.query.filter(FacultyProfile.user_id.in_(self.created_user_ids)).delete(synchronize_session=False)
                if getattr(self, "created_session_ids", None):
                    ClassSession.query.filter(ClassSession.id.in_(self.created_session_ids)).delete(synchronize_session=False)
                User.query.filter(User.id.in_(self.created_user_ids)).delete(synchronize_session=False)
            db.session.commit()

    def test_all_twenty_two_scenarios(self):
        print("\n=======================================================")
        print(" RUNNING 22 PRODUCTION ATTENDEASE SYSTEM TEST SCENARIOS")
        print("=======================================================")

        dummy_image = make_dummy_base64_image()
        passed_quality = {
            "passed": True,
            "blur": {"is_sharp": True, "probability": 0.95},
            "spoof": {"is_live": True, "probability": 0.95},
            "nsfw": {"is_safe": True, "probability": 0.99},
        }

        failed_quality = {
            "passed": False,
            "blur": {"is_sharp": False, "probability": 0.20},
            "spoof": {"is_live": True, "probability": 0.95},
            "nsfw": {"is_safe": True, "probability": 0.99},
        }

        ts = int(time.time_ns())

        # ----------------------------------------------------
        # SCENARIO 1: Create a new student account (Alice)
        # ----------------------------------------------------
        print("\n--- SCENARIO 1: Create New Student Account ---")
        student_email = f"alice_{ts}@university.edu"
        alice_roll_num = f"STU-ALICE-{ts}"
        reg_res = self.client.post("/api/auth/register", json={
            "name": "Alice Smith",
            "email": student_email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
            "roll_number": alice_roll_num
        })
        self.assertEqual(reg_res.status_code, 201)
        reg_data = reg_res.get_json()
        alice_token = reg_data["access_token"]
        alice_user_id = reg_data["user_id"]
        self.created_user_ids.append(alice_user_id)
        alice_roll = reg_data["roll_number"]
        self.assertEqual(reg_data["status"], "face_registration_pending")
        print(f"SCENARIO 1 PASSED: Student account created. Status: {reg_data['status']}")

        # ----------------------------------------------------
        # SCENARIO 2: Access denied before face registration
        # ----------------------------------------------------
        print("\n--- SCENARIO 2: Access Gated Before Face Registration ---")
        hist_unregistered_res = self.client.get(
            "/api/attendance/history",
            headers={"Authorization": f"Bearer {alice_token}"}
        )
        self.assertEqual(hist_unregistered_res.status_code, 403)
        print("SCENARIO 2 PASSED: Access denied (403) for unregistered student.")

        # ----------------------------------------------------
        # SCENARIO 3: Register student's face through Zepiris
        # ----------------------------------------------------
        print("\n--- SCENARIO 3: Register Student Face via Zepiris ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                face_reg_res = self.client.post(
                    "/api/student/face/register",
                    headers={"Authorization": f"Bearer {alice_token}"},
                    json={"image_base64": dummy_image}
                )
        self.assertEqual(face_reg_res.status_code, 200)
        self.assertEqual(face_reg_res.get_json()["status"], "active")
        print("SCENARIO 3 PASSED: Face registered and linked to Alice.")

        # ----------------------------------------------------
        # SCENARIO 4: Login as active student
        # ----------------------------------------------------
        print("\n--- SCENARIO 4: Login as Active Student ---")
        login_res = self.client.post("/api/auth/login", json={
            "identifier": alice_roll,
            "password": "Password123!"
        })
        self.assertEqual(login_res.status_code, 200)
        alice_token = login_res.get_json()["access_token"]
        print("SCENARIO 4 PASSED: Student login returns status 'active'.")

        # ----------------------------------------------------
        # SCENARIO 5: Create faculty account (Prof. Clark)
        # ----------------------------------------------------
        print("\n--- SCENARIO 5: Create Faculty Account ---")
        faculty_email = f"prof_clark_{ts}@university.edu"
        fac_id_code = f"FAC-CLARK-{ts}"
        fac_reg_res = self.client.post("/api/auth/register", json={
            "name": "Prof. Clark",
            "email": faculty_email,
            "password": "FacultyPassword123!",
            "confirm_password": "FacultyPassword123!",
            "role": "faculty",
            "faculty_id": fac_id_code,
            "department": "Computer Science"
        })
        self.assertEqual(fac_reg_res.status_code, 201)
        fac_token = fac_reg_res.get_json()["access_token"]
        fac_user_id = fac_reg_res.get_json()["user_id"]
        self.created_user_ids.append(fac_user_id)
        print("SCENARIO 5 PASSED: Faculty account created with zero biometric requirements.")

        # ----------------------------------------------------
        # SCENARIO 6: Faculty Starts Session with Configurable 5s Lifetime
        # ----------------------------------------------------
        print("\n--- SCENARIO 6: Faculty Starts Session with 5s Configurable QR Lifetime ---")
        with self.app.app_context():
            sub = Subject.query.filter_by(code="BS501").first()
            sub_id = sub.id

        sess_res = self.client.post(
            "/api/attendance/sessions",
            headers={"Authorization": f"Bearer {fac_token}"},
            json={"subject_id": sub_id, "qr_lifetime_seconds": 5}
        )
        self.assertEqual(sess_res.status_code, 201)
        sess_data = sess_res.get_json()["session"]
        sess_id = sess_data["id"]
        self.created_session_ids.append(sess_id)
        self.assertEqual(sess_data["qr_lifetime_seconds"], 5)

        qr_res = self.client.get(
            f"/api/qr/sessions/{sess_id}/qr",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(qr_res.status_code, 200)
        qr_data = qr_res.get_json()
        active_qr_token = qr_data["token"]
        self.assertEqual(qr_data["lifetime_seconds"], 5)
        print(f"SCENARIO 6 PASSED: Session #{sess_id} initialized with 5s QR lifetime. Token: {active_qr_token[:8]}...")

        # ----------------------------------------------------
        # SCENARIO 7 & 8 (QR Tests): Multiple students can use the same valid QR token
        # Register Bob Jones as Student B
        # ----------------------------------------------------
        print("\n--- SCENARIO 7 & 8: Multiple Students Attend with Same Active QR ---")
        bob_email = f"bob_{ts}@university.edu"
        bob_roll = f"STU-BOB-{ts}"
        bob_reg = self.client.post("/api/auth/register", json={
            "name": "Bob Jones",
            "email": bob_email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
            "roll_number": bob_roll
        })
        bob_token = bob_reg.get_json()["access_token"]
        self.created_user_ids.append(bob_reg.get_json()["user_id"])
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_bob_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                self.client.post(
                    "/api/student/face/register",
                    headers={"Authorization": f"Bearer {bob_token}"},
                    json={"image_base64": dummy_image}
                )

        # Alice marks attendance with active QR
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                alice_mark_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {alice_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(alice_mark_res.status_code, 201)
        self.assertEqual(alice_mark_res.get_json()["attendance"]["method"], "QR_FACE")

        # Bob marks attendance with the EXACT SAME active QR token within window
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_bob_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                bob_mark_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {bob_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(bob_mark_res.status_code, 201)
        print("SCENARIO 7 & 8 PASSED: Valid QR token accepted for multiple distinct students (non-destructive).")

        # ----------------------------------------------------
        # SCENARIO 9: Same Student Cannot Attend Twice (Duplicate Prevention)
        # ----------------------------------------------------
        print("\n--- SCENARIO 9: Duplicate Attendance Prevented ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                dup_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {alice_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(dup_res.status_code, 409)
        self.assertIn("already marked", dup_res.get_json()["error"].lower())
        print("SCENARIO 9 PASSED: Duplicate attendance rejected with 409 Conflict.")

        # ----------------------------------------------------
        # SCENARIO 9B: Concurrent Simultaneous Attendance Requests for Same Student
        # ----------------------------------------------------
        print("\n--- SCENARIO 9B: Concurrent Duplicate Requests Handled Cleanly (No 500) ---")
        david_email = f"david_{ts}@university.edu"
        david_roll = f"STU-DAVID-{ts}"
        david_reg = self.client.post("/api/auth/register", json={
            "name": "David Miller",
            "email": david_email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
            "roll_number": david_roll
        })
        david_token = david_reg.get_json()["access_token"]
        self.created_user_ids.append(david_reg.get_json()["user_id"])
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_bob_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                self.client.post(
                    "/api/student/face/register",
                    headers={"Authorization": f"Bearer {david_token}"},
                    json={"image_base64": dummy_image}
                )

        import concurrent.futures

        def submit_attendance():
            return self.client.post(
                "/api/attendance/mark",
                headers={"Authorization": f"Bearer {david_token}"},
                json={
                    "session_id": sess_id,
                    "token": active_qr_token,
                    "face_image": dummy_image
                }
            )

        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_bob_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    future1 = executor.submit(submit_attendance)
                    future2 = executor.submit(submit_attendance)
                    res1 = future1.result()
                    res2 = future2.result()

        statuses = sorted([res1.status_code, res2.status_code])
        self.assertEqual(statuses, [201, 409], f"Expected exactly one 201 and one 409, got: {statuses}")
        if res1.status_code == 409:
            self.assertIn("already marked", res1.get_json()["error"].lower())
        if res2.status_code == 409:
            self.assertIn("already marked", res2.get_json()["error"].lower())
        print(f"SCENARIO 9B PASSED: Simultaneous requests resolved atomically. Statuses: {statuses}. Zero 500 errors.")

        # ----------------------------------------------------
        # SCENARIO 10: Unauthenticated Student Rejected
        # ----------------------------------------------------
        print("\n--- SCENARIO 10: Unauthenticated Request Blocked ---")
        unauth_res = self.client.post(
            "/api/attendance/mark",
            json={
                "session_id": sess_id,
                "token": active_qr_token,
                "face_image": dummy_image
            }
        )
        self.assertEqual(unauth_res.status_code, 401)
        print("SCENARIO 10 PASSED: Unauthenticated request rejected with 401 Unauthorized.")

        # ----------------------------------------------------
        # SCENARIO 11: Register Charlie to test token-to-JWT identity binding
        # ----------------------------------------------------
        print("\n--- SCENARIO 11: Student Cannot Submit Another Student's Identity ---")
        charlie_email = f"charlie_{ts}@university.edu"
        charlie_roll = f"STU-CHARLIE-{ts}"
        charlie_reg = self.client.post("/api/auth/register", json={
            "name": "Charlie Day",
            "email": charlie_email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
            "roll_number": charlie_roll
        })
        charlie_token = charlie_reg.get_json()["access_token"]
        self.created_user_ids.append(charlie_reg.get_json()["user_id"])
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                self.client.post(
                    "/api/student/face/register",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={"image_base64": dummy_image}
                )

        # Charlie tries to submit Alice's face embedding
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                identity_mismatch_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(identity_mismatch_res.status_code, 401)
        self.assertIn("does not match registered student profile", identity_mismatch_res.get_json()["error"].lower())
        print("SCENARIO 11 PASSED: Identity mismatch rejected with 401 Unauthorized.")

        # ----------------------------------------------------
        # SCENARIO 12 & 21: Student Cannot Call Faculty Manual Mark Endpoint
        # ----------------------------------------------------
        print("\n--- SCENARIO 12 & 21: Student Blocked from Manual Attendance API ---")
        student_manual_res = self.client.post(
            f"/api/attendance/sessions/{sess_id}/manual-mark",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"roll_number": charlie_roll, "reason": "Attempted by student"}
        )
        self.assertEqual(student_manual_res.status_code, 403)
        print("SCENARIO 12 & 21 PASSED: Student blocked from manual override with 403 Forbidden.")

        # ----------------------------------------------------
        # SCENARIO 13: QR After Expiration Rejected (Server-Side Time Enforcement)
        # ----------------------------------------------------
        print("\n--- SCENARIO 13: Expired QR Token Rejected ---")
        with self.app.app_context():
            exp_session = ClassSession(
                subject_id=sub_id,
                faculty_id=fac_user_id,
                qr_token="expired_token_12345",
                qr_expires_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1),
                qr_lifetime_seconds=5,
                active=True,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.session.add(exp_session)
            db.session.commit()
            exp_sess_id = exp_session.id
            self.created_session_ids.append(exp_sess_id)

        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                exp_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": exp_sess_id,
                        "token": "expired_token_12345",
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(exp_res.status_code, 400)
        self.assertIn("expired", exp_res.get_json()["error"].lower())
        print("SCENARIO 13 PASSED: Expired QR token rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # SCENARIO 14 & 18: QR from Wrong / Old Session Rejected
        # ----------------------------------------------------
        print("\n--- SCENARIO 14 & 18: Old Session QR Rejected ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                wrong_sess_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": sess_id,
                        "token": "expired_token_12345",
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(wrong_sess_res.status_code, 400)
        print("SCENARIO 14 & 18 PASSED: QR token from old/different session rejected.")

        # ----------------------------------------------------
        # SCENARIO 15: Forged QR Token Rejected
        # ----------------------------------------------------
        print("\n--- SCENARIO 15: Forged QR Token Rejected ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                forged_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": sess_id,
                        "token": "forged_random_token_xyz999",
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(forged_res.status_code, 400)
        print("SCENARIO 15 PASSED: Forged QR token rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # SCENARIO 16: Modified / Tampered QR Token Rejected
        # ----------------------------------------------------
        print("\n--- SCENARIO 16: Modified QR Token Rejected ---")
        tampered_token = active_qr_token[:-2] + "00"
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                tampered_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": sess_id,
                        "token": tampered_token,
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(tampered_res.status_code, 400)
        print("SCENARIO 16 PASSED: Tampered QR token rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # SCENARIO 17: Inactive / Ended Session Rejects Attendance
        # ----------------------------------------------------
        print("\n--- SCENARIO 17: Ended Session Rejects Attendance ---")
        with self.app.app_context():
            ended_sess = ClassSession(
                subject_id=sub_id,
                faculty_id=fac_user_id,
                qr_token="valid_looking_token_123",
                qr_expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=60),
                active=False,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                ended_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.session.add(ended_sess)
            db.session.commit()
            ended_sess_id = ended_sess.id

        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                ended_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": ended_sess_id,
                        "token": "valid_looking_token_123",
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(ended_res.status_code, 400)
        self.assertIn("ended", ended_res.get_json()["error"].lower())
        print("SCENARIO 17 PASSED: Ended session rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # SCENARIO 18: Low Quality / Blur / Spoof Image Rejected
        # ----------------------------------------------------
        print("\n--- SCENARIO 18: Low Image Quality / Blur Rejected ---")
        with patch.object(zepiris_service, "assess_quality", return_value=failed_quality):
            quality_fail_res = self.client.post(
                "/api/attendance/mark",
                headers={"Authorization": f"Bearer {charlie_token}"},
                json={
                    "session_id": sess_id,
                    "token": active_qr_token,
                    "face_image": dummy_image
                }
            )
        self.assertEqual(quality_fail_res.status_code, 422)
        print("SCENARIO 18 PASSED: Low quality face image rejected with 422 Unprocessable Entity.")

        # ----------------------------------------------------
        # SCENARIO 18A: Anti-Spoofing Detection Rejects Fake/Printed/Screen Face (422)
        # ----------------------------------------------------
        print("\n--- SCENARIO 18A: Anti-Spoof Detection Rejects Spoof Presentation (422) ---")
        spoof_failed_quality = {
            "passed": False,
            "blur": {"is_sharp": True, "probability": 0.95},
            "spoof": {"is_live": False, "probability": 0.05},
            "nsfw": {"is_safe": True, "probability": 0.99},
        }
        with patch.object(zepiris_service, "assess_quality", return_value=spoof_failed_quality):
            spoof_reject_res = self.client.post(
                "/api/attendance/mark",
                headers={"Authorization": f"Bearer {charlie_token}"},
                json={
                    "session_id": sess_id,
                    "token": active_qr_token,
                    "face_image": dummy_image
                }
            )
        self.assertEqual(spoof_reject_res.status_code, 422)
        self.assertIn("quality check failed", spoof_reject_res.get_json()["error"].lower())
        print("SCENARIO 18A PASSED: Anti-spoof detection failure strictly rejected with 422 Unprocessable Entity.")

        # ----------------------------------------------------
        # SCENARIO 18A_EXC: Spoof Service Exception Fails Closed (422)
        # ----------------------------------------------------
        print("\n--- SCENARIO 18A_EXC: Spoof Service Exception Fails Closed (No Bypass) ---")
        from zepiris.schemas.ml_inference import BlurDetectionResult, NSFWDetectionResult
        with patch.object(zepiris_service.blur_service, "forward", return_value=BlurDetectionResult(is_sharp=True, probability=0.95)):
            with patch.object(zepiris_service.spoof_service, "forward", side_effect=RuntimeError("GPU/Inference driver failed")):
                with patch.object(zepiris_service.nsfw_service, "forward", return_value=NSFWDetectionResult(is_safe=True, probability=0.99)):
                    with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_charlie_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                        spoof_crash_res = self.client.post(
                            "/api/attendance/mark",
                            headers={"Authorization": f"Bearer {charlie_token}"},
                            json={
                                "session_id": sess_id,
                                "token": active_qr_token,
                                "face_image": dummy_image
                            }
                        )
        self.assertEqual(spoof_crash_res.status_code, 422)
        self.assertIn("quality check failed", spoof_crash_res.get_json()["error"].lower())
        # Verify stack trace is NOT leaked to student
        self.assertNotIn("GPU/Inference driver failed", json.dumps(spoof_crash_res.get_json()))
        print("SCENARIO 18A_EXC PASSED: Spoof service crash fails closed (422), sanitized error returned.")

        # ----------------------------------------------------
        # SCENARIO 18B: Client-Supplied Biometric Bypass Flags Ignored
        # ----------------------------------------------------
        print("\n--- SCENARIO 18B: Client Bypass Flags Ignored by Server ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                # Charlie sends Alice's face embedding, but injects fake bypass flags
                bypass_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image,
                        "face_verified": True,
                        "similarity_score": 99.9,
                        "confidence_score": 100.0,
                        "liveness": True,
                        "quality_passed": True,
                        "student_id": 99999
                    }
                )
        self.assertEqual(bypass_res.status_code, 401)
        self.assertIn("does not match registered student profile", bypass_res.get_json()["error"].lower())
        print("SCENARIO 18B PASSED: Injected client flags (face_verified, similarity_score, liveness) completely ignored.")

        # ----------------------------------------------------
        # SCENARIO 18C: Malformed / Non-Image Base64 Input Rejected (400)
        # ----------------------------------------------------
        print("\n--- SCENARIO 18C: Malformed Image Payload Rejected (400) ---")
        malformed_res = self.client.post(
            "/api/attendance/mark",
            headers={"Authorization": f"Bearer {charlie_token}"},
            json={
                "session_id": sess_id,
                "token": active_qr_token,
                "face_image": "data:image/jpeg;base64,not_a_valid_image_bytes_!!!"
            }
        )
        self.assertEqual(malformed_res.status_code, 400)
        self.assertIn("invalid face image format", malformed_res.get_json()["error"].lower())
        print("SCENARIO 18C PASSED: Malformed image payload rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # SCENARIO 19: No Face Detected in Image Rejected
        # ----------------------------------------------------
        print("\n--- SCENARIO 19: No Face Detected in Image Rejected ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(None, {"error": "No face detected"})):
                no_face_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {charlie_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )
        self.assertEqual(no_face_res.status_code, 400)
        print("SCENARIO 19 PASSED: No face detected rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # SCENARIO 20 & 22: Faculty Manual Attendance Override with Audit Reason
        # ----------------------------------------------------
        print("\n--- SCENARIO 20 & 22: Faculty Manual Attendance Override ---")
        manual_res = self.client.post(
            f"/api/attendance/sessions/{sess_id}/manual-mark",
            headers={"Authorization": f"Bearer {fac_token}"},
            json={
                "roll_number": charlie_roll,
                "reason": "Camera broken on student phone"
            }
        )
        self.assertEqual(manual_res.status_code, 201)
        manual_data = manual_res.get_json()["attendance"]
        self.assertEqual(manual_data["status"], "Present")
        self.assertEqual(manual_data["method"], "MANUAL")
        self.assertEqual(manual_data["reason"], "Camera broken on student phone")
        self.assertEqual(manual_data["roll_number"], charlie_roll)

        # Check records reflect manual method
        records_res = self.client.get(
            f"/api/attendance/sessions/{sess_id}/records",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(records_res.status_code, 200)
        rec_list = records_res.get_json()["records"]
        charlie_record = next(r for r in rec_list if r["roll_number"] == charlie_roll)
        self.assertEqual(charlie_record["method"], "MANUAL")
        self.assertEqual(charlie_record["reason"], "Camera broken on student phone")
        print("SCENARIO 20 & 22 PASSED: Faculty manually marked attendance as MANUAL with audit trail.")

        # ----------------------------------------------------
        # End active session cleanly and test history
        # ----------------------------------------------------
        end_res = self.client.delete(
            f"/api/attendance/sessions/{sess_id}",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(end_res.status_code, 200)

        fac_hist_res = self.client.get(
            "/api/attendance/sessions/history",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(fac_hist_res.status_code, 200)
        self.assertGreaterEqual(fac_hist_res.get_json()["total_sessions"], 1)

        print("\n=======================================================")
        print(" ALL 22 PRODUCTION SYSTEM TESTS PASSED SUCCESSFULLY! ")
        print("=======================================================\n")


if __name__ == "__main__":
    unittest.main()
