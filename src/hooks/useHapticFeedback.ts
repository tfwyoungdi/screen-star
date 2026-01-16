/**
 * Hook to trigger haptic feedback on supported devices
 */
export function useHapticFeedback() {
  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    // Check if vibration API is supported
    if ('vibrate' in navigator) {
      const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 25 : 50;
      navigator.vibrate(duration);
    }
  };

  const triggerSuccess = () => {
    if ('vibrate' in navigator) {
      // Double tap pattern for success
      navigator.vibrate([10, 50, 10]);
    }
  };

  const triggerError = () => {
    if ('vibrate' in navigator) {
      // Longer vibration for error
      navigator.vibrate([50, 30, 50]);
    }
  };

  return { triggerHaptic, triggerSuccess, triggerError };
}
