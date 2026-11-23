import { useEventTheme } from '../hooks/useEventTheme';
import { HEADER_DECORATIONS } from './events';

export function EventHeaderDecoration() {
  const event = useEventTheme();

  if (!event) return null;

  const Decoration = HEADER_DECORATIONS[event.headerDecoration];

  return <Decoration />;
}
