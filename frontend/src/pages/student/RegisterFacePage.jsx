import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';
import { cameraManager } from '../../utils/cameraManager';

export function RegisterFacePage() {
  const { user, registerFace, logout } = useAttendance();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if multiple cameras exist on the device
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

  const startCamera = useCallback(
    async (mode = facingMode) => {
      setCameraLoading(true);
      setCameraError('');
      setErrorMessage('');

      // Clean up previous stream before opening a new one
      if (streamRef.current) {
        cameraManager.stopStream(streamRef.current);
        streamRef.current = null;
      }

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
            console.warn('Video play note:', playErr);
          }
        }

        setCameraActive(true);
        setCameraLoading(false);
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraLoading(false);
        setCameraActive(false);

        const errStr = String(err.name || err.message || err);
        if (errStr.includes('NotAllowedError') || errStr.includes('PermissionDeniedError')) {
          setCameraError('Camera permission required. Please allow camera access in your browser settings.');
        } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
          setCameraError('No camera found on your device.');
        } else if (errStr.includes('NotReadableError') || errStr.includes('TrackStartError')) {
          setCameraError('Camera is currently in use by another application. Please close other camera apps.');
        } else {
          setCameraError(`Camera error: ${err.message || 'Unable to access camera'}`);
        }
      }
    },
    [facingMode]
  );

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
      cameraManager.stopAll();
    };
  }, [facingMode, startCamera, stopCamera]);

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const handleCaptureAndRegister = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setErrorMessage('Camera preview is not ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw raw image onto canvas
    ctx.drawImage(video, 0, 0, width, height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.95);

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await registerFace(base64Image);
      setSuccessMessage('Face successfully enrolled! Redirecting to Dashboard...');
      stopCamera();
    } catch (err) {
      console.error('Face registration failed:', err);
      setErrorMessage(err.message || 'Face registration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white mouse-light-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-neutral-200/40 blur-3xl" />
      </div>

      <div className="glass-panel-dark rounded-3xl p-6 md:p-8 w-full max-w-lg relative z-10 shadow-dark-glass my-6 text-white">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-lg mx-auto mb-3 shadow-lg">
            👤
          </div>
          <h1 className="font-black text-2xl md:text-3xl text-white tracking-tight">
            Register Your Face
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Student: <span className="text-white font-bold">{user?.name}</span> ({user?.roll_number || 'ID Pending'})
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-5 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-300 space-y-1">
          <p className="font-bold text-white mb-1">Registration Steps:</p>
          <p>1. Allow camera permission.</p>
          <p>2. Position your face centered inside the frame.</p>
          <p>3. Ensure good lighting and look directly into the camera.</p>
          <p>4. Click "Capture & Register Face".</p>
        </div>

        {/* Camera Container */}
        <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-white/20 aspect-4/3 flex items-center justify-center mb-5">
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

          {/* Oval Face Guide Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-48 h-64 md:w-56 md:h-72 border-2 border-dashed border-white/70 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
            </div>
          )}

          {/* Top Live Badge */}
          {cameraActive && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 text-[11px] font-medium text-neutral-300 z-20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Camera
            </div>
          )}

          {/* Flip Camera Button */}
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

          {/* Camera Loading */}
          {cameraLoading && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 z-20 space-y-2 text-white">
              <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Starting Camera...
              </p>
            </div>
          )}

          {/* Inactive Camera State */}
          {!cameraActive && !cameraLoading && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
              <div className="text-3xl text-neutral-500">📷</div>
              <p className="text-xs text-neutral-300 max-w-xs">
                {cameraError || 'Camera is currently inactive.'}
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

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium text-center">
            {successMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="white"
            size="lg"
            className="w-full shadow-lg font-bold"
            disabled={!cameraActive || isProcessing}
            onClick={handleCaptureAndRegister}
          >
            {isProcessing ? 'Processing Biometrics with Zepiris...' : 'Capture & Register Face →'}
          </Button>

          <div className="flex justify-between items-center text-xs text-neutral-400 pt-2 border-t border-white/10">
            <span>Powered by Zepiris (Buffalo_L)</span>
            <button
              onClick={logout}
              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
