import { useState, useEffect, useCallback } from 'react';
import { differenceInSeconds } from 'date-fns';

interface SLACountdownData {
  timeRemaining: string;
  isBreached: boolean;
  isWarning: boolean;
  percentRemaining: number;
}

interface UseSLACountdownProps {
  createdAt: string;
  targetHours: number;
  firstResponseAt?: string | null;
  status: string;
}

export function useRealtimeSLACountdown({
  createdAt,
  targetHours,
  firstResponseAt,
  status,
}: UseSLACountdownProps): SLACountdownData {
  const [countdown, setCountdown] = useState<SLACountdownData>({
    timeRemaining: '',
    isBreached: false,
    isWarning: false,
    percentRemaining: 100,
  });

  const calculateCountdown = useCallback(() => {
    // If already responded or resolved/closed, no countdown needed
    if (firstResponseAt || status === 'resolved' || status === 'closed') {
      return {
        timeRemaining: '',
        isBreached: false,
        isWarning: false,
        percentRemaining: 100,
      };
    }

    const createdDate = new Date(createdAt);
    const now = new Date();
    const targetDate = new Date(createdDate.getTime() + targetHours * 60 * 60 * 1000);
    
    const secondsRemaining = differenceInSeconds(targetDate, now);
    const totalSeconds = targetHours * 60 * 60;
    const percentRemaining = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
    
    const isBreached = secondsRemaining <= 0;
    const isWarning = !isBreached && percentRemaining <= 25;

    let timeRemaining: string;
    
    if (isBreached) {
      const overdueSeconds = Math.abs(secondsRemaining);
      const hours = Math.floor(overdueSeconds / 3600);
      const minutes = Math.floor((overdueSeconds % 3600) / 60);
      const secs = overdueSeconds % 60;
      
      if (hours > 0) {
        timeRemaining = `-${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeRemaining = `-${minutes}m ${secs}s`;
      } else {
        timeRemaining = `-${secs}s`;
      }
    } else {
      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const secs = secondsRemaining % 60;
      
      if (hours > 0) {
        timeRemaining = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeRemaining = `${minutes}m ${secs}s`;
      } else {
        timeRemaining = `${secs}s`;
      }
    }

    return {
      timeRemaining,
      isBreached,
      isWarning,
      percentRemaining,
    };
  }, [createdAt, targetHours, firstResponseAt, status]);

  useEffect(() => {
    // Initial calculation
    setCountdown(calculateCountdown());

    // Update every second for real-time countdown
    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateCountdown]);

  return countdown;
}
