import { useEffect, useRef, ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedPage({ children, className = '', delay = 0 }: AnimatedPageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity    = '0';
    el.style.transform  = 'translateY(18px)';
    el.style.transition = 'none';

    const t = setTimeout(() => {
      el.style.transition = `opacity 0.42s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.42s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }, 10);

    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div ref={ref} className={`animated-page ${className}`} style={{ willChange: 'opacity, transform' }}>
      {children}
    </div>
  );
}
