// ============================================
// Animated Page Wrapper
// Provides smooth page transition animations
// ============================================

import { useEffect, useState, type ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export default function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on mount
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`animated-page ${visible ? 'page-enter-active' : 'page-enter'} ${className}`}>
      {children}
    </div>
  );
}
