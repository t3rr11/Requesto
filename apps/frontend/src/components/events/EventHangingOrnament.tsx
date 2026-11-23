import type { ComponentType } from 'react';
import { useEventTheme } from '../../hooks/useEventTheme';
import { HANGING_ORNAMENTS } from './hangingOrnaments';

/**
 * Renders the active event theme's interactive ornament (e.g. the halloween
 * spider or the christmas surfing Santa), or nothing when no theme is active or
 * the theme declares none. Mount it inside a zero-width, full header height
 * anchor in the header layout so the ornament can attach to the header's top
 * or bottom edge after the environment selector.
 */
export function EventHangingOrnament() {
  const event = useEventTheme();

  if (!event?.hangingOrnament) return null;

  const Ornament: ComponentType = HANGING_ORNAMENTS[event.hangingOrnament];

  return <Ornament />;
}
