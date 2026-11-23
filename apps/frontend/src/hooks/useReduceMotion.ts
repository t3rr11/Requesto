import { useEffect } from 'react';
import { useSettingsStore } from '../store/settings/store';

const REDUCE_MOTION_CLASS = 'reduce-motion';

/**
 * Mirrors the reduceMotion setting onto the document root so the global
 * `.reduce-motion` rules in index.css can disable animations and transitions.
 * Mount once near the app root.
 */
export function useReduceMotion(): void {
  const reduceMotion = useSettingsStore(s => s.reduceMotion);

  useEffect(() => {
    document.documentElement.classList.toggle(REDUCE_MOTION_CLASS, reduceMotion);
    return () => document.documentElement.classList.remove(REDUCE_MOTION_CLASS);
  }, [reduceMotion]);
}
