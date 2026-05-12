// ============================================
// Skeleton Loader Component
// Animated placeholder during data loading
// ============================================

interface SkeletonProps {
  type?: 'text' | 'card' | 'table' | 'stat' | 'avatar';
  count?: number;
  width?: string;
  height?: string;
}

function SkeletonLine({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <div className="skeleton-line" style={{ width, height }} />
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card glass-card">
      <div className="skeleton-card-inner">
        <SkeletonLine width="60%" height="12px" />
        <SkeletonLine width="40%" height="28px" />
        <SkeletonLine width="80%" height="10px" />
      </div>
      <div className="skeleton-icon" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i}>
          <SkeletonLine width={`${40 + Math.random() * 50}%`} height="14px" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonStat() {
  return (
    <div className="glass-card stat-card skeleton-stat">
      <div className="stat-info" style={{ flex: 1 }}>
        <SkeletonLine width="70%" height="10px" />
        <div style={{ marginTop: 10 }}>
          <SkeletonLine width="50%" height="24px" />
        </div>
        <div style={{ marginTop: 8 }}>
          <SkeletonLine width="60%" height="10px" />
        </div>
      </div>
      <div className="skeleton-icon" />
    </div>
  );
}

export default function Skeleton({ type = 'text', count = 1, width, height }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return <>{items.map((_, i) => <SkeletonCard key={i} />)}</>;
  }

  if (type === 'stat') {
    return <>{items.map((_, i) => <SkeletonStat key={i} />)}</>;
  }

  if (type === 'table') {
    return (
      <table className="data-table">
        <thead>
          <tr>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <th key={i}><SkeletonLine width="70%" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((_, i) => <SkeletonTableRow key={i} />)}
        </tbody>
      </table>
    );
  }

  if (type === 'avatar') {
    return <div className="skeleton-avatar" />;
  }

  return (
    <>
      {items.map((_, i) => (
        <SkeletonLine key={i} width={width} height={height} />
      ))}
    </>
  );
}
