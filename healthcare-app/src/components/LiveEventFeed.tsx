// ============================================
// Live Event Feed Component
// Shows real-time WebSocket events with
// animated entrance and severity indicators
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Activity, Heart, Calendar, DollarSign, AlertTriangle, Server, Users } from 'lucide-react';
import { ws, type WSEvent } from '../services/websocket';

const typeIcons: Record<WSEvent['type'], JSX.Element> = {
  patient_alert: <Heart size={14} />,
  appointment_update: <Calendar size={14} />,
  vital_update: <Activity size={14} />,
  billing_event: <DollarSign size={14} />,
  system_event: <Server size={14} />,
  staff_status: <Users size={14} />,
};

const severityColors: Record<WSEvent['severity'], string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
  success: '#10b981',
};

interface LiveEventFeedProps {
  maxEvents?: number;
  filter?: WSEvent['type'][];
  compact?: boolean;
}

export default function LiveEventFeed({ maxEvents = 8, filter, compact = false }: LiveEventFeedProps) {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial events
    const initial = ws.getRecentEvents(maxEvents);
    setEvents(initial);

    const unsub = ws.onEvent((event) => {
      if (filter && !filter.includes(event.type)) return;
      setEvents(prev => {
        const next = [event, ...prev].slice(0, maxEvents);
        return next;
      });
    });

    return unsub;
  }, [maxEvents, filter]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="live-event-feed" id="live-event-feed">
      <div className="feed-header">
        <h3>
          <Activity size={16} className="feed-icon" />
          Live Activity
        </h3>
        <div className="feed-controls">
          <button
            className={`feed-toggle ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            <span className="feed-dot" />
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      <div className="feed-list" ref={feedRef}>
        {events.length === 0 ? (
          <div className="feed-empty">
            <Activity size={24} />
            <span>Waiting for events...</span>
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={event.id}
              className={`feed-item ${compact ? 'compact' : ''} severity-${event.severity} ${i === 0 ? 'feed-item-new' : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div
                className="feed-item-indicator"
                style={{ backgroundColor: severityColors[event.severity] }}
              />
              <div
                className="feed-item-icon"
                style={{ color: severityColors[event.severity] }}
              >
                {typeIcons[event.type]}
              </div>
              <div className="feed-item-content">
                <div className="feed-item-title">{event.title}</div>
                {!compact && <div className="feed-item-message">{event.message}</div>}
              </div>
              <div className="feed-item-time">{formatTime(event.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
