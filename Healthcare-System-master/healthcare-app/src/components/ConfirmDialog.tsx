// ============================================
// Confirm Dialog Component
// Animated confirmation modal with blur backdrop
// ============================================

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel, loading = false
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const variantColors = {
    danger: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: '🗑️' },
    warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: '⚠️' },
    info: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: 'ℹ️' },
  };

  const vc = variantColors[variant];

  return (
    <div className={`confirm-overlay ${visible ? 'visible' : ''}`} onClick={onCancel}>
      <div className={`confirm-dialog ${visible ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="confirm-close" onClick={onCancel}>
          <X size={16} />
        </button>
        <div className="confirm-icon" style={{ background: vc.bg, color: vc.color }}>
          <AlertTriangle size={28} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`btn btn-${variant === 'danger' ? 'danger' : 'primary'} btn-sm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
