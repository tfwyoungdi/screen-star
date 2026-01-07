import { useState, useEffect, useRef } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  startOnMount?: boolean;
}

export function useAnimatedCounter(
  endValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const { duration = 1500, startOnMount = true } = options;
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!startOnMount || hasAnimated || endValue === 0) {
      if (endValue === 0) setCount(0);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easeOut * endValue);
      
      setCount(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
        setHasAnimated(true);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [endValue, duration, startOnMount, hasAnimated]);

  return count;
}

export function formatAnimatedValue(
  value: number,
  prefix: string = '',
  suffix: string = ''
): string {
  return `${prefix}${value.toLocaleString()}${suffix}`;
}
