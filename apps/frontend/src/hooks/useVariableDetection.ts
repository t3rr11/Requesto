import { useState, useEffect, RefObject } from 'react';

export interface VariableDetectionResult {
  showSuggestions: boolean;
  currentVariable: string;
  cursorPosition: number;
}

export function useVariableDetection(
  value: string,
  inputRef: RefObject<HTMLInputElement | null>
): VariableDetectionResult {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentVariable, setCurrentVariable] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const position = input.selectionStart || 0;
    setCursorPosition(position);

    const textBeforeCursor = value.substring(0, position);

    // Check if we're inside a variable placeholder
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

    if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
      // We're inside {{ }}
      const varStart = lastOpenBrace + 2;
      const currentVar = textBeforeCursor.substring(varStart).trim();
      setCurrentVariable(currentVar);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setCurrentVariable('');
    }
  }, [value, inputRef]);

  return {
    showSuggestions,
    currentVariable,
    cursorPosition,
  };
}
