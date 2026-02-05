import { useState, useRef, useEffect } from 'react';
import { useEnvironmentStore } from '../store/environments';
import { extractVariableNames } from '../helpers/environmentHelpers';
import { useVariableDetection } from '../hooks/useVariableDetection';
import { VariableHighlight } from './variable-input/VariableHighlight';
import { VariableSuggestions } from './variable-input/VariableSuggestions';
import { VariableTooltip } from './variable-input/VariableTooltip';
import { VariableBadge } from './variable-input/VariableBadge';

interface VariableAwareInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  variableKey: string;
  variableValue: string;
  isSecret: boolean;
}

export function VariableAwareInput({ value, onChange, placeholder, disabled, className, type = 'text' }: VariableAwareInputProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    variableKey: '',
    variableValue: '',
    isSecret: false,
  });
  const [manualSuggestions, setManualSuggestions] = useState(false);
  const [clickedVariableStart, setClickedVariableStart] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { environmentsData } = useEnvironmentStore();

  // Get active environment and its variables
  const activeEnvironment = environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId);
  const enabledVariables = activeEnvironment?.variables.filter(v => v.enabled) || [];

  // Use custom hook for variable detection
  const { showSuggestions: autoShowSuggestions, currentVariable } = useVariableDetection(value, inputRef);
  const showSuggestions = autoShowSuggestions || manualSuggestions;

  // Click outside to close manual suggestions
  useEffect(() => {
    if (!manualSuggestions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setManualSuggestions(false);
        setClickedVariableStart(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [manualSuggestions]);

  // Extract and validate variables
  const usedVariables = extractVariableNames(value);
  const definedVariableKeys = new Set(enabledVariables.map(v => v.key));
  const hasUndefinedVariables = usedVariables.some(v => !definedVariableKeys.has(v));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setManualSuggestions(false);
    setClickedVariableStart(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputRef.current) {
      const position = inputRef.current.selectionStart || 0;
      const textBeforeCursor = value.substring(0, position);
      
      // Check if cursor is right after a variable (}}
      if (textBeforeCursor.endsWith('}}')) {
        // Find the start of this variable
        const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
        
        if (lastOpenBrace !== -1) {
          e.preventDefault();
          
          // Delete the entire variable
          const before = value.substring(0, lastOpenBrace);
          const after = value.substring(position);
          onChange(before + after);
          
          // Set cursor position after deletion
          setTimeout(() => {
            inputRef.current?.setSelectionRange(lastOpenBrace, lastOpenBrace);
          }, 0);
        }
      }
    }
  };

  const insertVariable = (varKey: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const position = input.selectionStart || 0;
    const textBeforeCursor = value.substring(0, position);

    // Use clicked variable position if available, otherwise search from cursor
    let lastOpenBrace = clickedVariableStart >= 0 ? clickedVariableStart : textBeforeCursor.lastIndexOf('{{');

    if (lastOpenBrace !== -1) {
      // Find the end of the variable to replace
      const textFromStart = value.substring(lastOpenBrace);
      const closingBraces = textFromStart.indexOf('}}');
      
      let endPosition = position;
      if (closingBraces !== -1) {
        // We found the closing braces, include them for replacement
        endPosition = lastOpenBrace + closingBraces + 2;
      }
      
      const before = value.substring(0, lastOpenBrace);
      const after = value.substring(endPosition);
      const newValue = `${before}{{${varKey}}}${after}`;
      onChange(newValue);

      // Set cursor after inserted variable
      setTimeout(() => {
        const newPosition = lastOpenBrace + varKey.length + 4; // {{ + varKey + }}
        input.setSelectionRange(newPosition, newPosition);
        input.focus();
      }, 0);
    }
    
    setManualSuggestions(false);
    setClickedVariableStart(-1);
  };

  const handleVariableHover = (e: React.MouseEvent, varKey: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const variable = enabledVariables.find(v => v.key === varKey);

    if (variable) {
      setTooltip({
        show: true,
        x: rect.left,
        y: rect.bottom + 5,
        variableKey: variable.key,
        variableValue: variable.value,
        isSecret: variable.isSecret === true,
      });
    }
  };

  const handleVariableLeave = () => {
    setTooltip({
      show: false,
      x: 0,
      y: 0,
      variableKey: '',
      variableValue: '',
      isSecret: false,
    });
  };

  const handleVariableClick = (varKey: string, clickIndex: number) => {
    if (!inputRef.current) return;
    
    // Find the specific clicked variable instance
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    let instanceCount = 0;
    let targetStart = -1;
    let targetCursor = -1;
    
    while ((match = regex.exec(value)) !== null) {
      if (match[1].trim() === varKey) {
        if (instanceCount === clickIndex) {
          targetStart = match.index; // Store the start position
          targetCursor = match.index + 2; // Position cursor after {{
          break;
        }
        instanceCount++;
      }
    }
    
    if (targetCursor !== -1) {
      // Store the start position for replacement
      setClickedVariableStart(targetStart);
      
      // Focus input and position cursor
      inputRef.current.focus();
      inputRef.current.setSelectionRange(targetCursor, targetCursor);
      
      // Show suggestions
      setManualSuggestions(true);
      
      // Hide tooltip
      handleVariableLeave();
    }
  };

  return (
    <div className="relative w-full">
      {/* Actual input (transparent text) */}
      <input
        ref={inputRef}
        type={type}
        spellCheck="false"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className} relative bg-transparent caret-gray-900 dark:caret-gray-100`}
      />

      {/* Highlighted content layer */}
      <VariableHighlight
        value={value}
        enabledVariables={enabledVariables}
        className={className}
        onVariableHover={handleVariableHover}
        onVariableLeave={handleVariableLeave}
        onVariableClick={handleVariableClick}
      />

      {/* Variable count badge */}
      <VariableBadge variableCount={usedVariables.length} hasUndefinedVariables={hasUndefinedVariables} />

      {/* Variable hover tooltip */}
      <VariableTooltip
        show={tooltip.show}
        x={tooltip.x}
        y={tooltip.y}
        variableKey={tooltip.variableKey}
        variableValue={tooltip.variableValue}
        isSecret={tooltip.isSecret}
        environmentName={activeEnvironment?.name}
      />

      {/* Autocomplete suggestions */}
      <VariableSuggestions
        ref={suggestionsRef}
        show={showSuggestions}
        variables={enabledVariables}
        currentVariable={currentVariable}
        onInsert={insertVariable}
      />
    </div>
  );
}
