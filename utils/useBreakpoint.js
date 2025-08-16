import { useState, useEffect } from 'react';

const breakpoints = {
  xs: 0,        // <360
  mobile: 360,  // 360-639
  sm: 640,      // 640-767
  md: 768,      // 768-1023
  lg: 1024,     // 1024-1279
  xl: 1280,     // 1280-1439
  '2xl': 1440,  // 1440+
};

function getBreakpoint(width) {
  if (width < breakpoints.mobile) return 'xs';
  if (width < breakpoints.sm) return 'mobile';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints['2xl']) return 'xl';
  return '2xl';
}

export default function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [breakpoint, setBreakpoint] = useState(getBreakpoint(width));

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setBreakpoint(getBreakpoint(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    breakpoint,
    isXs: breakpoint === 'xs',
    isMobile: breakpoint === 'mobile',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
  };
} 