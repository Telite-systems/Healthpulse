// ============================================
// Connection Status Indicator
// Shows real-time database connection status
// ============================================

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { db } from '../services/realtimeDb';

export default function ConnectionStatus() {
  const [status, setStatus] = useState('connected');

  useEffect(() => {
    const unsub = db.onConnectionStatus(setStatus);
    return unsub;
  }, []);

  const statusConfig = {
    connected: { icon: <Wifi size={13} />, label: 'Connected', className: 'connected' },
    disconnected: { icon: <WifiOff size={13} />, label: 'Offline', className: 'disconnected' },
    syncing: { icon: <RefreshCw size={13} className="spin" />, label: 'Syncing...', className: 'syncing' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.connected;

  return (
    <div className={`connection-status ${config.className}`} id="connection-status" title={`Database: ${config.label}`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}
