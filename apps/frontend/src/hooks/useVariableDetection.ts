import { useState, useEffect, type RefObject } from 'react';

export type VariableDetectionResult = {
  showSuggestions: boolean;
  currentVariable: string;
  cursorPosition: number;
};

export function useVariableDetection(
  value: string,
  inputRef: RefObject<HTMLInputElement | null>,
  suggestionsRef?: RefObject<HTMLDivElement | null>,
): VariableDetectionResult {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentVariable, setCurrentVariable] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const evaluate = () => {
      const position = input.selectionStart || 0;
      setCursorPosition(position);

      const isFocused = input.ownerDocument.activeElement === input;
      const textBeforeCursor = value.substring(0, position);
      const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
      const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

      if (isFocused && lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
        const varStart = lastOpenBrace + 2;
        const currentVar = textBeforeCursor.substring(varStart).trim();
        setCurrentVariable(currentVar);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        setCurrentVariable('');
      }
    };

    const handleBlur = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && suggestionsRef?.current?.contains(nextTarget)) return;
      setShowSuggestions(false);
      setCurrentVariable('');
    };

    evaluate();
    input.addEventListener('focus', evaluate);
    input.addEventListener('blur', handleBlur);
    return () => {
      input.removeEventListener('focus', evaluate);
      input.removeEventListener('blur', handleBlur);
    };
  }, [value, inputRef, suggestionsRef]);

  return { showSuggestions, currentVariable, cursorPosition };
}
