import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { QRScanner } from '../../components/attendance/QRScanner';
import { AttendanceSuccess } from '../../components/attendance/AttendanceSuccess';
import { Button } from '../../components/ui/Button';
import { cameraManager } from '../../utils/cameraManager';

export function ScanAttendancePage() {
  const { navigate, scannedQR, setScannedQR, markAttendance } = useAttendance();

  // Steps: 'scan_qr' -> 'verify_face' -> 'success'
  const [step, setStep] = useState('scan_qr');
  const [scanKey, setScanKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [markedResult, setMarkedResult] = useState(null);

  // Video & Camera State for Face Verification Step
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) | 'environment' (back)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check if device has multiple video input devices (front & back cameras)
  useEffect(() => {
    if (navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // Stop active media stream tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      cameraManager.stopStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start Camera Stream and attach directly to video element
  const startCamera = useCallback(
    async (mode = facingMode) => {
      setCameraLoading(true);
      setCameraError('');

      // Stop any existing stream before starting a new one
      if (streamRef.current) {
        cameraManager.stopStream(streamRef.current);
        streamRef.current = null;
      }

      // Small delay on mobile to ensure previous hardware camera lock is released
      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        const constraints = {
          video: {
            facingMode: mode,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraManager.register(stream);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video auto-play handled:', playErr);
          }
        }

        setCameraActive(true);
        setCameraLoading(false);
      } catch (err) {
        console.error('Camera acquisition error:', err);
        setCameraLoading(false);
        setCameraActive(false);

        const errStr = String(err.name || err.message || err);
        if (errStr.includes('NotAllowedError') || errStr.includes('PermissionDeniedError')) {
          setCameraError(
            'Camera permission denied. Please allow camera access in your browser or device settings.'
          );
        } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
          setCameraError('No camera found on this device.');
        } else if (errStr.includes('NotReadableError') || errStr.includes('TrackStartError')) {
          setCameraError(
            'Camera is currently in use by another application or tab. Please close other camera apps and retry.'
          );
        } else {
          setCameraError(`Unable to start camera: ${err.message || 'Unknown camera error'}`);
        }
      }
    },
    [facingMode]
  );

  // Manage camera lifecycle based on current step
  useEffect(() => {
    if (step === 'verify_face') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      cameraManager.stopAll();
    };
  }, [step, facingMode, startCamera, stopCamera]);

  // Flip camera (Front <-> Back)
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Step 1: QR Scanned Successfully -> Transition to Face Verification
  const handleQRScanSuccess = (qrData) => {
    if (!qrData?.session_id || !qrData?.token) {
      setError('Invalid QR code format. Missing session ID or token.');
      return;
    }

    setScannedQR(qrData);
    setError('');
    setStep('verify_face');
  };

  // Step 2: Capture Frame & Verify Identity with Zepiris
  const handleVerifyAndMarkAttendance = async () => {
    if (!scannedQR?.session_id || !scannedQR?.token) {
      setError('Missing QR session data. Please re-scan QR code.');
      setStep('scan_qr');
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      setError('Camera preview is not ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw un-mirrored raw image for accurate facial recognition
    ctx.drawImage(video, 0, 0, width, height);

    const faceImageBase64 = canvas.toDataURL('image/jpeg', 0.95);

    setError('');
    setIsSubmitting(true);

    try {
      const result = await markAttendance(
        scannedQR.session_id,
        scannedQR.token,
        faceImageBase64
      );

      setMarkedResult(result?.attendance || {});
      stopCamera();
      setStep('success');
    } catch (err) {
      console.error('Attendance mark error:', err);
      setError(err.message || 'Face verification failed or QR code expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setError('');
    stopCamera();
    setScanKey((k) => k + 1);
    setStep('scan_qr');
  };

  return (
    <div className="py-6 space-y-6 max-w-md mx-auto">
      {step !== 'success' && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              stopCamera();
              navigate('/student');
            }}
            className="text-xs font-semibold text-neutral-400 hover:text-black cursor-pointer transition-colors"
          >
            ← Back to Dashboard
          </button>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
            {step === 'scan_qr' ? 'Step 1 of 2: Scan QR' : 'Step 2 of 2: Face Verification'}
          </span>
        </div>
      )}

      {/* Step 1: Scan QR Code */}
      {step === 'scan_qr' && (
        <div className="space-y-4">
          <QRScanner
            key={scanKey}
            onScanSuccess={handleQRScanSuccess}
            isSubmitting={isSubmitting}
            externalError={error}
          />

          {error && (
            <div className="text-center pt-2">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                ↻ Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Zepiris Face Verification */}
      {step === 'verify_face' && (
        <div className="glass-panel-dark rounded-3xl p-6 md:p-8 relative z-10 shadow-dark-glass text-white space-y-5">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-base mx-auto mb-2 shadow-md">
              👤
            </div>
            <h2 className="font-black text-xl text-white tracking-tight">
              Verify Face Identity
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              QR validated for Session #{scannedQR?.session_id}. Look directly into the camera.
            </p>
          </div>

          {/* Camera Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-white/20 aspect-4/3 flex items-center justify-center">
            {/* Always-mounted Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch((e) => console.warn('Play note:', e));
                }
              }}
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'mirror-mode' : ''
              } ${cameraActive ? 'block' : 'opacity-0'}`}
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {/* Oval Face Alignment Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="w-40 h-56 md:w-48 md:h-64 border-2 border-dashed border-white/70 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            )}

            {/* Top Live Badge */}
            {cameraActive && (
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 text-[11px] font-medium text-neutral-300 z-20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Camera Active
              </div>
            )}

            {/* Flip Camera Button (if device has multiple cameras) */}
            {cameraActive && hasMultipleCameras && (
              <button
                type="button"
                onClick={handleToggleCamera}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 text-xs font-semibold text-white flex items-center gap-1 z-20 cursor-pointer transition-colors"
                title="Flip Camera"
              >
                🔄 {facingMode === 'user' ? 'Back Camera' : 'Front Camera'}
              </button>
            )}

            {/* Camera Loading State */}
            {cameraLoading && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 z-20 space-y-2 text-white">
                <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Starting Camera...
                </p>
              </div>
            )}

            {/* Camera Inactive / Error Fallback */}
            {!cameraActive && !cameraLoading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <div className="text-3xl text-neutral-500">📷</div>
                <p className="text-xs text-neutral-300 max-w-xs">
                  {cameraError || 'Camera stream is currently inactive.'}
                </p>
                <Button
                  variant="white"
                  size="sm"
                  onClick={() => startCamera(facingMode)}
                  className="text-xs font-bold shadow-md"
                >
                  Enable Camera
                </Button>
              </div>
            )}

            {/* Hidden Canvas for High-Res Capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Verification Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5">
            <Button
              variant="white"
              size="lg"
              className="w-full shadow-lg font-bold"
              disabled={!cameraActive || isSubmitting}
              onClick={handleVerifyAndMarkAttendance}
            >
              {isSubmitting ? 'Verifying with Zepiris...' : 'Verify Face & Mark Attendance ✓'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs text-neutral-400 hover:text-white"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              ← Re-scan QR Code
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 'success' && (
        <AttendanceSuccess
          subject={markedResult?.subject || 'Class Session'}
          onBackToDashboard={() => navigate('/student')}
        />
      )}
    </div>
  );
}
