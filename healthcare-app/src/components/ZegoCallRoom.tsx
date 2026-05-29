// ============================================
// ZEGOCLOUD Video Call Integration
// Real-time video/audio calling via ZEGOCLOUD UIKit
// StrictMode-safe with proper cleanup
// ============================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, RotateCcw } from 'lucide-react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// ── ZEGOCLOUD Credentials ──────────────────────────────────────────────────
const ZEGO_APP_ID = 982964860;
const ZEGO_SERVER_SECRET = 'faa14b2d145bfbdde6bc3d2aa97f450d';

export interface ZegoCallProps {
  roomID: string;
  userID: string;
  userName: string;
  callType?: 'oneOnOneVideo' | 'oneOnOneVoice' | 'groupVideo' | 'groupVoice';
  onCallEnd?: () => void;
  onLeaveRoom?: () => void;
}

export default function ZegoCallRoom({
  roomID,
  userID,
  userName,
  callType = 'oneOnOneVideo',
  onCallEnd,
}: ZegoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const initCountRef = useRef(0);  // Track StrictMode double-mount
  const userEndedRef = useRef(false); // Track if user explicitly ended
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [dismissWarning, setDismissWarning] = useState(false);
  const [copied, setCopied] = useState(false);

  const isInsecure = typeof window !== 'undefined' && !window.isSecureContext;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopy = useCallback(() => {
    const text = currentOrigin;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }, [currentOrigin]);

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
  };

  // Stable callback ref so we don't re-trigger the effect
  const onCallEndRef = useRef(onCallEnd);
  onCallEndRef.current = onCallEnd;

  useEffect(() => {
    initCountRef.current += 1;
    let active = true;
    userEndedRef.current = false;

    const initCall = async () => {
      // Small delay to let StrictMode unmount the first mount
      await new Promise(r => setTimeout(r, 100));
      if (!active || !containerRef.current) return;

      try {
        if (!active || !containerRef.current) return;

        // Generate kit token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          ZEGO_APP_ID,
          ZEGO_SERVER_SECRET,
          roomID,
          userID,
          userName
        );

        // Create instance
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        if (!active || !containerRef.current) {
          try { zp.destroy(); } catch {}
          return;
        }

        const isVideo = callType === 'oneOnOneVideo' || callType === 'groupVideo';
        const isGroup = callType === 'groupVideo' || callType === 'groupVoice';

        // Join room
        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
          turnOnCameraWhenJoining: isVideo,
          turnOnMicrophoneWhenJoining: true,
          showScreenSharingButton: true,
          showLayoutButton: isGroup,
          showRoomTimer: true,
          onLeaveRoom: () => {
            userEndedRef.current = true;
            onCallEndRef.current?.();
          },
          onUserLeave: () => {
            if (!isGroup) {
              userEndedRef.current = true;
              onCallEndRef.current?.();
            }
          },
        });

        if (active) setLoading(false);
      } catch (err: any) {
        console.error('[ZegoCallRoom] Init error:', err);
        if (active) {
          // Don't show errors from StrictMode cancel — only real errors
          const msg = err?.message || err?.msg || String(err);
          if (msg.includes('cancel login') || msg.includes('1102026')) {
            // StrictMode artifact — just retry silently
            return;
          }
          setError(msg || 'Failed to initialize video call');
          setLoading(false);
        }
      }
    };

    initCall();

    return () => {
      active = false;
      try {
        zpRef.current?.destroy?.();
      } catch { /* ignore cleanup errors */ }
      zpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomID, userID, userName, callType, retryKey]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRetryKey(k => k + 1);
  }, []);

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, #0c1829 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 440, padding: 48,
          background: 'rgba(255,255,255,0.04)', borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📡</div>
          <h2 style={{ color: '#e2e8f0', fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
            Connection Issue
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24 }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={handleRetry} style={{
              padding: '10px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: '#fff',
              fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <RotateCcw size={16} /> Retry
            </button>
            <button onClick={() => onCallEnd?.()} style={{
              padding: '10px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <PhoneOff size={16} /> End Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading + Container ──────────────────────────────────────────────────
  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'linear-gradient(135deg, #0c1829, #1a1a2e)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '3px solid rgba(8,145,178,0.2)', borderTopColor: '#0891b2',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#67e8f9', marginTop: 20, fontSize: '0.92rem', fontWeight: 600 }}>
            Connecting to video call...
          </p>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4 }}>
            Room: {roomID}
          </p>
          <button onClick={() => onCallEnd?.()} style={{
            marginTop: 24, padding: '8px 20px', borderRadius: 12, border: 'none',
            background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.82rem',
          }}>
            Cancel
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {isInsecure && !dismissWarning && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '520px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          zIndex: 100002,
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '2.2rem', lineHeight: '1' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#f87171', fontSize: '1.2rem', fontWeight: '700' }}>
                Secure Context Required
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                Your browser blocks Camera and Microphone access on insecure connections (<strong>HTTP</strong>). 
                To start video calling, you can switch to secure HTTPS (recommended) or allow the origin in your browser flags:
              </p>

              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '0.82rem',
                color: '#93c5fd',
                marginBottom: '14px',
                borderLeft: '4px solid #3b82f6',
                lineHeight: '1.5'
              }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Option 1: Switch to HTTPS (Easiest)</strong>
                We have enabled HTTPS support on the server. Click below to reload the page securely:
                <div style={{ marginTop: '8px' }}>
                  <a
                    href={currentOrigin.replace('http://', 'https://')}
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '0.78rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Switch to HTTPS Call
                  </a>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                  * Note: The browser will show an "Insecure/Self-signed Certificate" warning. Click <strong>Advanced</strong> → <strong>Proceed (unsafe)</strong> to proceed to the secure session.
                </span>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '0.82rem',
                color: '#94a3b8',
                marginBottom: '20px',
                borderLeft: '4px solid #ef4444',
                lineHeight: '1.5'
              }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>Option 2: Enable Chrome / Edge flags (HTTP Dev bypass):</strong>
                <ol style={{ margin: 0, paddingLeft: '18px' }}>
                  <li style={{ marginBottom: '6px' }}>
                    Open a new tab and go to:<br />
                    <code style={{ 
                      backgroundColor: 'rgba(244, 63, 94, 0.15)', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      color: '#f43f5e',
                      fontSize: '0.78rem',
                      wordBreak: 'break-all',
                      marginTop: '4px',
                      display: 'inline-block'
                    }}>
                      chrome://flags/#unsafely-treat-insecure-origin-as-secure
                    </code>
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    Set <strong>Insecure origins treated as secure</strong> to <strong>Enabled</strong>.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    Add this site's address to the text box:
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                      <code style={{ 
                        backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        color: '#34d399',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        wordBreak: 'break-all'
                      }}>{currentOrigin}</code>
                      <button onClick={handleCopy} style={{
                        padding: '4px 10px', 
                        fontSize: '0.75rem', 
                        borderRadius: '6px', 
                        border: 'none',
                        cursor: 'pointer', 
                        backgroundColor: copied ? '#10b981' : '#334155', 
                        color: '#fff', 
                        fontWeight: '600',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.backgroundColor = '#475569'; }}
                      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.backgroundColor = '#334155'; }}>
                        {copied ? '✓ Copied' : 'Copy Origin'}
                      </button>
                    </div>
                  </li>
                  <li>
                    Click the <strong>Relaunch</strong> button in the bottom right of the flags page to restart the browser.
                  </li>
                </ol>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setDismissWarning(true)}
                  style={{
                    padding: '8px 18px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    cursor: 'pointer',
                    backgroundColor: '#ef4444', 
                    color: '#fff', 
                    fontSize: '0.82rem',
                    fontWeight: '600', 
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Dismiss / Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: '100vw', height: '100vh',
          position: 'fixed', inset: 0, zIndex: 99999, background: '#000',
        }}
      />
    </>
  );
}

// ── Utility: Generate a DETERMINISTIC room ID ──────────────────────────────
// IMPORTANT: Must be stable — both caller and callee must get the same room ID.
// Do NOT use Date.now() or Math.random() here — it would make each side join
// a different room and they'd never connect across different browsers.
export function generateRoomID(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  // Simple deterministic hash: sum of char codes mod 99999 for uniqueness
  const seed = sorted.join('|');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const hashStr = Math.abs(hash).toString(36).slice(0, 8);
  return `hp_${clean(sorted[0])}_${clean(sorted[1])}_${hashStr}`;
}
