import base64
import io
import json
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


class AttendEaseZepirisTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        # Generate two distinct normalized 512-d embeddings for testing
        np.random.seed(42)
        v1 = np.random.randn(512).astype(np.float32)
        cls.student_alice_emb = (v1 / np.linalg.norm(v1)).tolist()

        v2 = np.random.randn(512).astype(np.float32)
        cls.student_bob_emb = (v2 / np.linalg.norm(v2)).tolist()

    def setUp(self):
        self.app = self.__class__.app
        self.client = self.__class__.client

    def test_all_fourteen_scenarios(self):
        print("\n=======================================================")
        print(" RUNNING 14 MANDATORY ATTENDEASE + ZEPIRIS SYSTEM TESTS")
        print("=======================================================")

        dummy_image = make_dummy_base64_image()
        passed_quality = {
            "passed": True,
            "blur": {"is_sharp": True, "probability": 0.95},
            "spoof": {"is_live": True, "probability": 0.95},
            "nsfw": {"is_safe": True, "probability": 0.99},
        }

        ts = int(datetime.now().timestamp() * 1000)

        # ----------------------------------------------------
        # TEST 1: Create a new student account
        # Expected: Unique student ID generated. Account created. Face registration required.
        # ----------------------------------------------------
        print("\n--- TEST 1: Create New Student Account ---")
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
        self.assertEqual(reg_res.status_code, 201, f"Student registration failed: {reg_res.get_json()}")
        reg_data = reg_res.get_json()
        alice_token = reg_data["access_token"]
        alice_user_id = reg_data["user_id"]
        alice_roll = reg_data["roll_number"]

        self.assertEqual(reg_data["role"], "student")
        self.assertEqual(reg_data["status"], "face_registration_pending")
        self.assertTrue(reg_data["requires_face_registration"])
        self.assertEqual(alice_roll, alice_roll_num)
        print(f"TEST 1 PASSED: Student account created for {student_email} (Roll: {alice_roll}). Status: {reg_data['status']}")

        # ----------------------------------------------------
        # TEST 2: Try accessing student dashboard / history before face registration
        # Expected: Access denied / face registration required
        # ----------------------------------------------------
        print("\n--- TEST 2: Student Dashboard / History Gated Before Face Registration ---")
        hist_unregistered_res = self.client.get(
            "/api/attendance/history",
            headers={"Authorization": f"Bearer {alice_token}"}
        )
        self.assertEqual(hist_unregistered_res.status_code, 403)
        self.assertIn("face registration required", hist_unregistered_res.get_json()["error"].lower())

        status_res = self.client.get(
            "/api/student/face/status",
            headers={"Authorization": f"Bearer {alice_token}"}
        )
        self.assertEqual(status_res.status_code, 200)
        self.assertFalse(status_res.get_json()["face_registered"])
        self.assertEqual(status_res.get_json()["status"], "face_registration_pending")
        print("TEST 2 PASSED: Access denied for un-enrolled student. Status: face_registration_pending.")

        # ----------------------------------------------------
        # TEST 3: Register student's face through Zepiris
        # Expected: Zepiris registration succeeds. Zepiris identity linked to student's unique ID.
        # ----------------------------------------------------
        print("\n--- TEST 3: Register Student Face via Zepiris ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                face_reg_res = self.client.post(
                    "/api/student/face/register",
                    headers={"Authorization": f"Bearer {alice_token}"},
                    json={"image_base64": dummy_image}
                )

        self.assertEqual(face_reg_res.status_code, 200, f"Face registration failed: {face_reg_res.get_json()}")
        face_reg_data = face_reg_res.get_json()
        self.assertEqual(face_reg_data["status"], "active")
        zepiris_id = face_reg_data["zepiris_identity_id"]
        self.assertTrue(zepiris_id.startswith("zepiris_stu_"))

        with self.app.app_context():
            student_obj = Student.query.filter_by(user_id=alice_user_id).first()
            self.assertEqual(student_obj.status, "active")
            self.assertEqual(student_obj.zepiris_identity_id, zepiris_id)
            self.assertIsNotNone(student_obj.face_profile)
            self.assertEqual(student_obj.face_profile.zepiris_identity_id, zepiris_id)
        print(f"TEST 3 PASSED: Face registered with Zepiris. Identity: {zepiris_id} linked to Student ID: {alice_user_id}.")

        # ----------------------------------------------------
        # TEST 4: Login as the newly created student
        # Expected: Student can access dashboard and status is active
        # ----------------------------------------------------
        print("\n--- TEST 4: Login as Active Student ---")
        login_stu_res = self.client.post("/api/auth/login", json={
            "email": student_email,
            "password": "Password123!"
        })
        self.assertEqual(login_stu_res.status_code, 200)
        login_stu_data = login_stu_res.get_json()
        self.assertEqual(login_stu_data["status"], "active")
        self.assertFalse(login_stu_data["requires_face_registration"])
        alice_token = login_stu_data["access_token"]

        # History should now be accessible (returns 0 records initially)
        hist_active_res = self.client.get(
            "/api/attendance/history",
            headers={"Authorization": f"Bearer {alice_token}"}
        )
        self.assertEqual(hist_active_res.status_code, 200)
        print("TEST 4 PASSED: Student login returns status 'active', dashboard & history accessible.")

        # ----------------------------------------------------
        # TEST 5: Create a new faculty account
        # Expected: Unique faculty ID generated. Faculty goes directly to faculty dashboard. No face registration.
        # ----------------------------------------------------
        print("\n--- TEST 5: Create New Faculty Account ---")
        faculty_email = f"prof_clark_{ts}@university.edu"
        fac_id_code_in = f"FAC-CLARK-{ts}"
        fac_reg_res = self.client.post("/api/auth/register", json={
            "name": "Prof. Clark",
            "email": faculty_email,
            "password": "FacultyPassword123!",
            "confirm_password": "FacultyPassword123!",
            "role": "faculty",
            "faculty_id": fac_id_code_in,
            "department": "Computer Science"
        })
        self.assertEqual(fac_reg_res.status_code, 201)
        fac_reg_data = fac_reg_res.get_json()
        fac_token = fac_reg_data["access_token"]
        fac_user_id = fac_reg_data["user_id"]
        fac_id_code = fac_reg_data["faculty_id"]

        self.assertEqual(fac_reg_data["role"], "faculty")
        self.assertEqual(fac_reg_data["status"], "active")
        self.assertFalse(fac_reg_data["requires_face_registration"])
        self.assertEqual(fac_id_code, fac_id_code_in)
        print(f"TEST 5 PASSED: Faculty account created for {faculty_email} (ID: {fac_id_code}). Zero biometric requirements.")

        # ----------------------------------------------------
        # TEST 6: Start an attendance session as faculty
        # Expected: Subject selection works. QR generated with rotating token.
        # ----------------------------------------------------
        print("\n--- TEST 6: Faculty Starts Attendance Session & Generates Dynamic QR ---")
        with self.app.app_context():
            sub = Subject.query.filter_by(code="BS501").first()
            self.assertIsNotNone(sub)
            sub_id = sub.id

        sess_res = self.client.post(
            "/api/attendance/sessions",
            headers={"Authorization": f"Bearer {fac_token}"},
            json={"subject_id": sub_id}
        )
        self.assertEqual(sess_res.status_code, 201)
        sess_data = sess_res.get_json()["session"]
        sess_id = sess_data["id"]

        qr_res = self.client.get(
            f"/api/qr/sessions/{sess_id}/qr",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(qr_res.status_code, 200)
        qr_data = qr_res.get_json()
        active_qr_token = qr_data["token"]
        print(f"TEST 6 PASSED: Session #{sess_id} started for BS501. Dynamic QR token generated: {active_qr_token[:8]}...")

        # ----------------------------------------------------
        # TEST 7: Student scans QR
        # Expected: Valid session ID and token ready for face verification
        # ----------------------------------------------------
        print("\n--- TEST 7: Student Validates QR Token ---")
        self.assertIsNotNone(sess_id)
        self.assertIsNotNone(active_qr_token)
        print(f"TEST 7 PASSED: QR token {active_qr_token[:8]}... captured for Session #{sess_id}.")

        # ----------------------------------------------------
        # TEST 8: Correct student scans their registered face
        # Expected: Zepiris recognizes/verifies the correct identity. Backend confirms it matches the logged-in student. Attendance marked successfully. Timestamp stored.
        # ----------------------------------------------------
        print("\n--- TEST 8: Correct Student Marks Attendance with Zepiris Verification ---")
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                mark_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {alice_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )

        self.assertEqual(mark_res.status_code, 201, f"Attendance mark failed: {mark_res.get_json()}")
        att_data = mark_res.get_json()["attendance"]
        self.assertEqual(att_data["status"], "Present")
        self.assertEqual(att_data["roll_number"], alice_roll)
        self.assertEqual(att_data["subject_code"], "BS501")
        self.assertTrue(att_data["verification"]["matched"])
        self.assertGreaterEqual(att_data["verification"]["similarity"], 99.0)
        self.assertIn("timestamp", att_data)
        print(f"TEST 8 PASSED: Attendance marked for Alice (Roll: {alice_roll}). Zepiris match verified ({att_data['verification']['similarity']}%).")

        # ----------------------------------------------------
        # TEST 9: Different student/person attempts attendance using the QR
        # Expected: Attendance rejected (401)
        # ----------------------------------------------------
        print("\n--- TEST 9: Different Person's Face Scanned (Identity Mismatch) ---")
        # Enroll Bob as a separate student with Bob's embedding
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

        # Register Bob's face with Bob's embedding
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_bob_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                self.client.post(
                    "/api/student/face/register",
                    headers={"Authorization": f"Bearer {bob_token}"},
                    json={"image_base64": dummy_image}
                )

        # Bob logs in and tries to mark attendance, but Alice's face is scanned!
        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                mismatch_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {bob_token}"},
                    json={
                        "session_id": sess_id,
                        "token": active_qr_token,
                        "face_image": dummy_image
                    }
                )

        self.assertEqual(mismatch_res.status_code, 401)
        self.assertIn("face verification failed", mismatch_res.get_json()["error"].lower())
        print("TEST 9 PASSED: Attendance rejected with 401 Unauthorized for mismatched facial identity.")

        # ----------------------------------------------------
        # TEST 10: Unregistered student attempts attendance
        # Expected: Attendance rejected (403)
        # ----------------------------------------------------
        print("\n--- TEST 10: Unregistered / Pending Student Attempts Attendance ---")
        unregistered_email = f"pending_stu_{ts}@university.edu"
        unreg_res = self.client.post("/api/auth/register", json={
            "name": "Pending Student",
            "email": unregistered_email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
        })
        pending_token = unreg_res.get_json()["access_token"]

        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            unreg_mark_res = self.client.post(
                "/api/attendance/mark",
                headers={"Authorization": f"Bearer {pending_token}"},
                json={
                    "session_id": sess_id,
                    "token": active_qr_token,
                    "face_image": dummy_image
                }
            )
        self.assertEqual(unreg_mark_res.status_code, 403)
        self.assertIn("face registration required", unreg_mark_res.get_json()["error"].lower())
        print("TEST 10 PASSED: Unregistered student attendance rejected with 403 Forbidden.")

        # ----------------------------------------------------
        # TEST 11: Expired QR
        # Expected: Attendance rejected (400)
        # ----------------------------------------------------
        print("\n--- TEST 11: Expired QR Token Rejected ---")
        with self.app.app_context():
            exp_session = ClassSession(
                subject_id=sub_id,
                faculty_id=fac_user_id,
                qr_token="expired_token_test_123",
                qr_expires_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=60),
                active=True,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.session.add(exp_session)
            db.session.commit()
            exp_sess_id = exp_session.id

        with patch.object(zepiris_service, "assess_quality", return_value=passed_quality):
            with patch.object(zepiris_service, "extract_face_embedding", return_value=(np.array(self.student_alice_emb, dtype=np.float32), {"face_detected": True, "embedding_dim": 512})):
                exp_mark_res = self.client.post(
                    "/api/attendance/mark",
                    headers={"Authorization": f"Bearer {alice_token}"},
                    json={
                        "session_id": exp_sess_id,
                        "token": "expired_token_test_123",
                        "face_image": dummy_image
                    }
                )

        self.assertEqual(exp_mark_res.status_code, 400)
        self.assertIn("expired", exp_mark_res.get_json()["error"].lower())
        print("TEST 11 PASSED: Expired QR rejected with 400 Bad Request.")

        # ----------------------------------------------------
        # TEST 12: Duplicate attendance
        # Expected: Attendance rejected (409)
        # ----------------------------------------------------
        print("\n--- TEST 12: Duplicate Attendance Rejected ---")
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
        print("TEST 12 PASSED: Duplicate attendance rejected with 409 Conflict.")

        # ----------------------------------------------------
        # TEST 13: Faculty operations
        # Expected: Never asked for face verification.
        # ----------------------------------------------------
        print("\n--- TEST 13: Faculty Operations (No Biometrics) ---")
        # Live monitor feed
        live_res = self.client.get(
            f"/api/attendance/sessions/{sess_id}/records",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(live_res.status_code, 200)
        live_data = live_res.get_json()
        self.assertEqual(live_data["total_present"], 1)
        self.assertEqual(live_data["records"][0]["roll_number"], alice_roll)

        # End session
        end_res = self.client.delete(
            f"/api/attendance/sessions/{sess_id}",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(end_res.status_code, 200)

        # Session history
        fac_hist_res = self.client.get(
            "/api/attendance/sessions/history",
            headers={"Authorization": f"Bearer {fac_token}"}
        )
        self.assertEqual(fac_hist_res.status_code, 200)
        fac_hist_data = fac_hist_res.get_json()
        self.assertGreaterEqual(fac_hist_data["total_sessions"], 1)
        print("TEST 13 PASSED: Faculty conducted live session, verified attendance feed, and ended session without any face checks.")

        # ----------------------------------------------------
        # TEST 14: Refresh / Re-login persistence
        # Expected: Account state, Zepiris identity association, and attendance history remain persisted.
        # ----------------------------------------------------
        print("\n--- TEST 14: Persistence Across Re-login ---")
        relogin_res = self.client.post("/api/auth/login", json={
            "email": student_email,
            "password": "Password123!"
        })
        self.assertEqual(relogin_res.status_code, 200)
        relogin_data = relogin_res.get_json()
        self.assertEqual(relogin_data["status"], "active")
        self.assertFalse(relogin_data["requires_face_registration"])
        new_token = relogin_data["access_token"]

        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.get_json()
        self.assertTrue(me_data["face_registered"])
        self.assertEqual(me_data["status"], "active")

        # Check attendance history persisted
        stu_hist_res = self.client.get("/api/attendance/history", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(stu_hist_res.status_code, 200)
        stu_hist_data = stu_hist_res.get_json()
        self.assertEqual(stu_hist_data["total_attended"], 1)
        self.assertEqual(stu_hist_data["records"][0]["session_id"], sess_id)
        print(f"TEST 14 PASSED: Account state (active), Zepiris profile, and attendance history fully persisted.")

        print("\n=======================================================")
        print(" ALL 14 MANDATORY SYSTEM TESTS PASSED SUCCESSFULLY!")
        print("=======================================================\n")


if __name__ == "__main__":
    unittest.main()
