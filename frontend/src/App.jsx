import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";

const API_URL = "http://127.0.0.1:5000";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      onLogin(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>AttendEase</h1>
        <p style={styles.subtitle}>College Attendance System</p>

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={styles.testInfo}>
          Student: student@test.com / 123456
          <br />
          Faculty: faculty@test.com / 123456
        </p>
      </div>
    </div>
  );
}

function FacultyDashboard({ user, onLogout }) {
  const [session, setSession] = useState(null);
  const [qrToken, setQrToken] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);

  const createSession = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/attendance/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({
            subject_id: 1,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create session");
      }

      setSession(data.session);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!session) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to end this attendance session?"
    );

    if (!confirmed) {
      return;
    }

    setEnding(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/attendance/sessions/${session.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not end session");
      }

      setSession(null);
      setQrToken("");
      setExpiresIn(0);

      setMessage("Attendance session ended successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const getQR = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/qr/sessions/${session.id}/qr`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not get QR");
        }

        if (!cancelled) {
          setQrToken(data.token);
          setExpiresIn(data.expires_in);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      }
    };

    getQR();

    const interval = setInterval(getQR, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, user.access_token]);

  return (
    <div style={styles.page}>
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <div>
            <h1>Faculty Dashboard</h1>
            <p>Welcome, {user.name}</p>
          </div>

          <button style={styles.logoutButton} onClick={onLogout}>
            Logout
          </button>
        </div>

        {!session ? (
          <div style={styles.card}>
            <h2>Data Structures</h2>
            <p>CS201</p>

            {message && <p style={styles.error}>{message}</p>}

            <button
              style={styles.button}
              onClick={createSession}
              disabled={loading}
            >
              {loading ? "Starting..." : "Start Attendance"}
            </button>
          </div>
        ) : (
          <div style={styles.card}>
            <h2>{session.subject}</h2>
            <p>{session.subject_code}</p>

            <div style={styles.qrContainer}>
              {qrToken && (
                <QRCodeCanvas
                  value={JSON.stringify({
                    session_id: session.id,
                    token: qrToken,
                  })}
                  size={300}
                />
              )}
            </div>

            <h3>QR expires in {expiresIn}s</h3>

            <p>Students can scan this QR to mark their attendance.</p>

            <button
              style={styles.endButton}
              onClick={endSession}
              disabled={ending}
            >
              {ending ? "Ending..." : "End Attendance"}
            </button>

            {message && (
              <p style={styles.message}>
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentDashboard({ user, onLogout }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const startScanner = async () => {
    setError("");
    setResult("");
    processingRef.current = false;

    setScanning(true);

    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode("qr-reader");

        scannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText) => {
            if (processingRef.current) {
              return;
            }

            processingRef.current = true;

            try {
              const qrData = JSON.parse(decodedText);

              if (!qrData.session_id || !qrData.token) {
                throw new Error("Invalid attendance QR code");
              }

              await qrScanner.stop();
              await qrScanner.clear();

              scannerRef.current = null;
              setScanning(false);

              const response = await fetch(
                `${API_URL}/api/attendance/mark`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.access_token}`,
                  },
                  body: JSON.stringify({
                    session_id: qrData.session_id,
                    token: qrData.token,
                  }),
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.error || "Attendance failed"
                );
              }

              setResult("Attendance marked successfully!");
            } catch (error) {
              console.error("QR processing error:", error);

              setScanning(false);
              setError(
                error.message || "Could not process QR code"
              );
            }
          },
          () => {
            // Normal QR scanning failures are ignored.
          }
        );
      } catch (error) {
        console.error("Scanner error:", error);

        setScanning(false);
        setError(
          "Could not access the camera. Please allow camera permission."
        );
      }
    }, 200);
  };

  const stopScanner = async () => {
    const qrScanner = scannerRef.current;

    if (qrScanner) {
      try {
        await qrScanner.stop();
      } catch (error) {
        console.log("Scanner already stopped.");
      }

      try {
        await qrScanner.clear();
      } catch (error) {
        console.log("Scanner already cleared.");
      }

      scannerRef.current = null;
    }

    processingRef.current = false;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      const qrScanner = scannerRef.current;

      if (qrScanner) {
        qrScanner
          .stop()
          .then(() => qrScanner.clear())
          .catch(() => {});

        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <div>
            <h1>Student Dashboard</h1>
            <p>Welcome, {user.name}</p>
          </div>

          <button
            style={styles.logoutButton}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>

        <div style={styles.card}>
          <h2>Attendance</h2>

          <div style={styles.attendanceBox}>
            <strong>Overall Attendance</strong>
            <span>100%</span>
          </div>

          {result && (
            <div style={styles.success}>
              ✓ {result}
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {!scanning ? (
            <button
              style={styles.button}
              onClick={startScanner}
            >
              Scan Attendance
            </button>
          ) : (
            <>
              <div
                id="qr-reader"
                style={styles.scanner}
              />

              <button
                style={styles.secondaryButton}
                onClick={stopScanner}
              >
                Stop Scanner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.role === "faculty") {
    return (
      <FacultyDashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <StudentDashboard
      user={user}
      onLogout={handleLogout}
    />
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    background: "white",
    padding: "35px",
    borderRadius: "18px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  },

  subtitle: {
    color: "#666",
    marginBottom: "25px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginBottom: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "16px",
  },

  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    background: "#111827",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "10px",
  },

  secondaryButton: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "white",
    color: "#111827",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "15px",
  },

  endButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "20px",
  },

  logoutButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
  },

  error: {
    color: "#dc2626",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  message: {
    color: "#166534",
    marginTop: "15px",
  },

  testInfo: {
    marginTop: "20px",
    color: "#888",
    fontSize: "13px",
  },

  dashboard: {
    width: "100%",
    maxWidth: "1000px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  qrContainer: {
    margin: "30px 0",
  },

  attendanceBox: {
    padding: "25px",
    background: "#f3f4f6",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    margin: "25px 0",
  },

  scanner: {
    width: "100%",
    maxWidth: "450px",
    margin: "20px auto",
  },
};

export default App;