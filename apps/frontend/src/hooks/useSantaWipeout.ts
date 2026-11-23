import { useCallback, useEffect, useRef, useState } from 'react';

export type SantaPhase = 'surfing' | 'wiped-out' | 'jumping';

const WIPEOUT_DURATION_MS = 4000;
const JUMP_DURATION_MS = 900;

/**
 * Drives the surfing Santa's click interaction: knockOff() sends him into the
 * water, a few seconds later he jumps back onto the board and returns to
 * surfing. Clicks are ignored until he is back on the board.
 */
export function useSantaWipeout() {
  const [phase, setPhase] = useState<SantaPhase>('surfing');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const knockOff = useCallback(() => {
    if (phase !== 'surfing') return;

    setPhase('wiped-out');
    timers.current.push(
      setTimeout(() => {
        setPhase('jumping');
        timers.current.push(setTimeout(() => setPhase('surfing'), JUMP_DURATION_MS));
      }, WIPEOUT_DURATION_MS)
    );
  }, [phase]);

  return { phase, knockOff };
}
