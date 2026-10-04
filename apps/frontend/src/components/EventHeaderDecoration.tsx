import { useEventTheme } from '../hooks/useEventTheme';
import { useSettingsStore } from '../store/settings/store';
import { HEADER_DECORATIONS } from './events';

export function EventHeaderDecoration() {
  const event = useEventTheme();
  const disableEventThemes = useSettingsStore(s => s.disableEventThemes);

  if (!event || disableEventThemes) return null;

  const Decoration = HEADER_DECORATIONS[event.headerDecoration];

  return <Decoration />;
}
