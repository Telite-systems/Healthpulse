// ============================================
// Live Heartbeat Pulse Monitor
// Real-time heart rate monitor with ECG line
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { ws } from '../services/websocket';

export default function LivePulse() {
  const [bpm, setBpm] = useState(72);
  const [pulseAnim, setPulseAnim] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const unsub = ws.onHeartbeat((newBpm) => {
      setBpm(newBpm);
      setPulseAnim(true);
      setTimeout(() => setPulseAnim(false), 300);
      dataRef.current.push(newBpm);
      if (dataRef.current.length > 60) dataRef.current.shift();
    });

    return unsub;
  }, []);

  // Draw ECG-like waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const data = dataRef.current;
      if (data.length < 2) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Draw grid lines
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.06)';
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw ECG line
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.1)');
      gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.8)');
      gradient.addColorStop(1, '#0ea5e9');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      const step = w / 60;
      const minBpm = 50;
      const maxBpm = 110;
      const range = maxBpm - minBpm;

      data.forEach((val, i) => {
        const x = i * step;
        // Add ECG-style spikes
        const normalized = (val - minBpm) / range;
        const baseY = h - normalized * h * 0.6 - h * 0.2;

        // Simulate ECG spike pattern
        const spike = Math.sin(i * 0.5) > 0.8 ? -15 : 0;
        const y = baseY + spike;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();

      // Glow effect on the latest point
      if (data.length > 0) {
        const lastX = (data.length - 1) * step;
        const lastVal = data[data.length - 1];
        const lastNormalized = (lastVal - minBpm) / range;
        const lastY = h - lastNormalized * h * 0.6 - h * 0.2;

        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0ea5e9';
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const bpmStatus = bpm < 60 ? 'low' : bpm > 90 ? 'high' : 'normal';

  return (
    <div className="live-pulse-container" id="live-pulse-monitor">
      <div className="pulse-header">
        <div className={`pulse-icon ${pulseAnim ? 'beating' : ''}`}>
          <Heart size={16} fill="currentColor" />
        </div>
        <div className="pulse-info">
          <span className="pulse-label">Heart Rate</span>
          <span className={`pulse-bpm ${bpmStatus}`}>{bpm} <small>BPM</small></span>
        </div>
      </div>
      <canvas ref={canvasRef} width={200} height={50} className="pulse-canvas" />
    </div>
  );
}
