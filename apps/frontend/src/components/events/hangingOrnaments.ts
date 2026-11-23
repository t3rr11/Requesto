import type { ComponentType } from 'react';
import type { EventHangingOrnamentKind } from '../../events/types';
import { SpiderOrnament } from './SpiderOrnament';

/**
 * Maps a hanging ornament kind (declared by an event in src/events/registry.ts)
 * to the component that renders it. Keyed by the EventHangingOrnamentKind
 * union, so a missing component for a new kind is a compile-time error.
 */
export const HANGING_ORNAMENTS: Record<EventHangingOrnamentKind, ComponentType> = {
  spider: SpiderOrnament,
};
