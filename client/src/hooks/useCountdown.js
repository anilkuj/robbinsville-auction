import { useState, useEffect } from 'react';

/**
 * Computes remaining seconds from server-authoritative timerEndsAt epoch.
 * Clients never run the countdown independently — they derive it from timerEndsAt.
 */
export function useCountdown(timerEndsAt, timerPaused, timerRemainingOnPause) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (timerPaused) {
      setRemaining(Math.ceil((timerRemainingOnPause || 0) / 1000));
      return;
    }

    if (!timerEndsAt) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = timerEndsAt - Date.now();
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [timerEndsAt, timerPaused, timerRemainingOnPause]);

  return remaining;
}
