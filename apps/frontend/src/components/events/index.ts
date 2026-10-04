import type { ComponentType } from 'react';
import type { EventHeaderDecorationKind } from '../../events/types';
import { CobwebDecoration } from './CobwebDecoration';

/**
 * Maps a header decoration kind (declared by an event in src/events/registry.ts)
 * to the component that renders it. Keyed by the EventHeaderDecorationKind
 * union, so a missing component for a new kind is a compile-time error.
 */
export const HEADER_DECORATIONS: Record<EventHeaderDecorationKind, ComponentType> = {
  cobweb: CobwebDecoration,
};
