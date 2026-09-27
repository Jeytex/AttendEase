import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cameraManager } from '../../utils/cameraManager';

export function QRScanner({ onScanSuccess, isSubmitting = false, externalError = '' }) {
  const [scanState, setScanState] = useState('scanning'); // 'scanning' | 'detected' | 'verified'
  const [cameraError, setCameraError] = useState('');
  const [manualSessionId, setManualSessionId] = useState('1');
  const [manualToken, setManualToken] = useState('');
  const [showManual, setShowManual] = useState(false);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const containerId = 'attend-qr-reader';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {
        // Scanner already stopped
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // Container already cleared
      }
      scannerRef.current = null;
    }
    cameraManager.stopAll();
  };

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      setCameraError('');
      isProcessingRef.current = false;

      // Small delay to ensure container element is in DOM
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isMounted) return;

      try {
        const qrScanner = new Html5Qrcode(containerId);
        scannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
              return { width: Math.max(180, Math.floor(edge)), height: Math.max(180, Math.floor(edge)) };
            },
          },
          async (decodedText) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            try {
              let parsed;
              try {
                parsed = JSON.parse(decodedText);
              } catch {
                throw new Error('QR code content is not a valid AttendEase JSON payload.');
              }

              if (!parsed.session_id || !parsed.token) {
                throw new Error('Invalid attendance QR code: missing session ID or token.');
              }

              setScanState('detected');
              await stopScanner();

              setTimeout(() => {
                setScanState('verified');
                setTimeout(() => {
                  if (onScanSuccess) {
                    onScanSuccess(parsed);
                  }
                }, 400);
              }, 500);
            } catch (err) {
              console.error('QR parse error:', err);
              isProcessingRef.current = false;
              setCameraError(err.message || 'Invalid QR code. Please scan a valid AttendEase session QR.');
            }
          },
          () => {
            // Normal frame without QR code - ignore
          }
        );
      } catch (err) {
        console.warn('Camera start info:', err);
        if (isMounted) {
          const errStr = String(err);
          if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
            setCameraError('Camera permission denied. Please allow camera access in browser settings or enter the code manually below.');
          } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
            setCameraError('No camera found on this device. You can enter the code manually below.');
          } else {
            setCameraError('Camera not accessible in this context. You can enter the session code manually below.');
          }
          setShowManual(true);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [onScanSuccess]);

  // Fallback submit for testing without camera
  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    const tokenVal = manualToken.trim();
    if (!tokenVal) {
      setCameraError('Please enter a valid QR token');
      return;
    }

    setScanState('detected');
    setTimeout(() => {
      setScanState('verified');
      setTimeout(() => {
        if (onScanSuccess) {
          onScanSuccess({
            session_id: parseInt(manualSessionId, 10) || 1,
            token: tokenVal,
          });
        }
      }, 300);
    }, 400);
  };

  const displayError = externalError || cameraError;

  return (
    <Card variant="dark-glass" className="p-8 max-w-md mx-auto text-center" tilt={false}>
      <div className="mb-6">
        <h3 className="text-2xl font-black text-white tracking-tight">
          Mark Attendance
        </h3>
        <p className="text-xs text-neutral-400 mt-1 font-medium">
          Align classroom QR code within frame
        </p>
      </div>

      {/* Camera Viewport / Scanner Frame */}
      <div className="relative w-64 h-64 mx-auto rounded-2xl bg-black border border-white/20 flex items-center justify-center mb-6 overflow-hidden">
        {/* 4 Corner Reticle Brackets */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white z-10 pointer-events-none" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white z-10 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white z-10 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white z-10 pointer-events-none" />

        {/* Animated Scan Line */}
        {scanState === 'scanning' && !displayError && (
          <div className="absolute left-0 right-0 h-0.5 bg-white shadow-xs animate-scan-line z-10 pointer-events-none" />
        )}

        {/* Real Camera Container */}
        <div
          id={containerId}
          className="w-full h-full object-cover"
          style={{ display: displayError ? 'none' : 'block' }}
        />

        {/* Scan Status Overlay */}
        {scanState === 'verified' || isSubmitting ? (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-20 space-y-2">
            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              {isSubmitting ? 'Recording Attendance...' : 'QR Verified ✓'}
            </p>
          </div>
        ) : scanState === 'detected' ? (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-20 space-y-2 text-white">
            <span className="w-4 h-4 rounded-full bg-white animate-ping inline-block" />
            <p className="text-xs font-bold uppercase tracking-wider">
              QR Code Detected...
            </p>
          </div>
        ) : displayError ? (
          <div className="p-4 text-center text-neutral-400">
            <svg className="w-12 h-12 opacity-40 text-neutral-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-xs text-neutral-300 font-medium">Camera Inactive</p>
          </div>
        ) : null}
      </div>

      {displayError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
          {displayError}
        </div>
      )}

      {/* Manual Input Toggle / Simulator fallback */}
      <div className="space-y-3">
        {showManual ? (
          <form onSubmit={handleManualSubmit} className="space-y-2 text-left">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Session #</label>
                <input
                  type="number"
                  value={manualSessionId}
                  onChange={(e) => setManualSessionId(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/10 border border-white/20 text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-white"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">QR Token</label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. 24-char token"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/10 border border-white/20 text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-white"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="white"
              size="md"
              className="w-full shadow-lg font-bold mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Submit & Mark Attendance'}
            </Button>
          </form>
        ) : (
          <Button
            variant="dark-glass"
            size="sm"
            className="w-full text-xs text-neutral-300"
            onClick={() => setShowManual(true)}
          >
            Enter Code Manually / Testing
          </Button>
        )}
      </div>
    </Card>
  );
}
