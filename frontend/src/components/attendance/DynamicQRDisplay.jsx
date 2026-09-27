import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { API_URL, getAuthHeaders } from '../../api/config';
import { useAttendance } from '../../context/AttendanceContext';

export function DynamicQRDisplay({
  sessionId,
  subject = 'Data Structures',
  subjectCode = 'CS201',
  presentCount = 0,
  onEndSession,
  isEnding = false,
}) {
  const { user } = useAttendance();
  const [qrToken, setQrToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(5);
  const [lifetimeSeconds, setLifetimeSeconds] = useState(5);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId || !user) return;

    let isMounted = true;

    const fetchQR = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/qr/sessions/${sessionId}/qr`,
          {
            headers: getAuthHeaders(user.access_token),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch QR');
        }

        if (isMounted) {
          setQrToken(data.token);
          setExpiresIn(data.expires_in ?? 5);
          if (data.lifetime_seconds) {
            setLifetimeSeconds(data.lifetime_seconds);
          }
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          console.error('QR fetch error:', err);
          setError(err.message);
        }
      }
    };

    fetchQR();
    const interval = setInterval(fetchQR, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, user]);

  const qrPayload = qrToken
    ? JSON.stringify({
        session_id: sessionId,
        token: qrToken,
      })
    : '';

  return (
    <Card variant="dark-glass" className="p-8 max-w-md mx-auto text-center" tilt={true}>
      {/* Session Title */}
      <h2 className="text-2xl font-black text-white tracking-tight">
        {subject}
      </h2>
      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1 mb-6">
        {subjectCode} • Session #{sessionId}
      </p>

      {/* Dynamic QR Code Canvas */}
      <div className="w-64 h-64 mx-auto rounded-2xl p-4 bg-white border border-white/30 flex flex-col items-center justify-center mb-6 shadow-2xl">
        {qrPayload ? (
          <QRCodeCanvas
            value={qrPayload}
            size={220}
            level="H"
            includeMargin={true}
          />
        ) : (
          <div className="text-neutral-400 text-xs font-mono animate-pulse">
            Generating Secure QR...
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400 mb-4">{error}</p>
      ) : (
        <>
          <p className="text-xs text-neutral-400 font-medium mb-1">
            Dynamic QR rotates automatically ({lifetimeSeconds}s window)
          </p>
          <p className="text-sm font-extrabold font-mono text-white mb-6">
            Next refresh in <span className="text-emerald-400">{expiresIn}s</span>
          </p>
        </>
      )}

      {/* Present Count */}
      <div className="py-2.5 px-6 rounded-xl bg-white/10 border border-white/20 text-sm font-extrabold text-white inline-block mb-8 backdrop-blur-md">
        {presentCount} <span className="font-normal text-xs text-neutral-300">Students marked present</span>
      </div>

      {onEndSession && (
        <Button
          variant="danger"
          size="md"
          className="w-full text-xs font-bold"
          onClick={onEndSession}
          disabled={isEnding}
        >
          {isEnding ? 'Ending Session...' : 'End Attendance Session'}
        </Button>
      )}
    </Card>
  );
}
