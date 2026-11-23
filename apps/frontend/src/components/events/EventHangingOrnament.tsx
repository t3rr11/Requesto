import type { ComponentType } from 'react';
import { useEventTheme } from '../../hooks/useEventTheme';
import { HANGING_ORNAMENTS } from './hangingOrnaments';

/**
 * Renders the active event theme's interactive hanging ornament (e.g. the
 * halloween spider), or nothing when no theme is active or the theme declares
 * none. Mount it inside a zero-width anchor in the header layout so the
 * ornament hangs from the header's top edge after the environment selector.
 */
export function EventHangingOrnament() {
  const event = useEventTheme();

  if (!event?.hangingOrnament) return null;

  const Ornament: ComponentType = HANGING_ORNAMENTS[event.hangingOrnament];

  return <Ornament />;
}
