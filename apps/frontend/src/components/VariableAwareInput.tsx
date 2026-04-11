import { useState, useRef, useEffect } from 'react';
import { useEnvironmentStore } from '../store/environments/store';
import { extractVariableNames } from '../helpers/environment';
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

type TooltipState = {
  show: boolean;
  x: number;
  y: number;
  variableKey: string;
  variableValue: string;
  isSecret: boolean;
};

const emptyTooltip: TooltipState = {
  show: false,
  x: 0,
  y: 0,
  variableKey: '',
  variableValue: '',
  isSecret: false,
};

export function VariableAwareInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  type = 'text',
}: VariableAwareInputProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(emptyTooltip);
  const [manualSuggestions, setManualSuggestions] = useState(false);
  const [clickedVariableStart, setClickedVariableStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { environmentsData } = useEnvironmentStore();

  const activeEnvironment = environmentsData.environments.find(
    e => e.id === environmentsData.activeEnvironmentId,
  );
  const enabledVariables = activeEnvironment?.variables.filter(v => v.enabled) || [];

  const { showSuggestions: autoShowSuggestions, currentVariable } = useVariableDetection(
    value,
    inputRef,
  );
  const showSuggestions = autoShowSuggestions || manualSuggestions;

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

      if (textBeforeCursor.endsWith('}}')) {
        const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
        if (lastOpenBrace !== -1) {
          e.preventDefault();
          const before = value.substring(0, lastOpenBrace);
          const after = value.substring(position);
          onChange(before + after);
          setTimeout(() => {
            inputRef.current?.setSelectionRange(lastOpenBrace, lastOpenBrace);
          }, 0);
        }
      }
    }
  };

  const handleInsertVariable = (varKey: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const position = input.selectionStart || 0;
    const textBeforeCursor = value.substring(0, position);
    const lastOpenBrace =
      clickedVariableStart >= 0 ? clickedVariableStart : textBeforeCursor.lastIndexOf('{{');

    if (lastOpenBrace !== -1) {
      const textFromStart = value.substring(lastOpenBrace);
      const closingBraces = textFromStart.indexOf('}}');
      const endPosition = closingBraces !== -1 ? lastOpenBrace + closingBraces + 2 : position;

      const before = value.substring(0, lastOpenBrace);
      const after = value.substring(endPosition);
      onChange(`${before}{{${varKey}}}${after}`);

      setTimeout(() => {
        const newPosition = lastOpenBrace + varKey.length + 4;
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

  const handleVariableLeave = () => setTooltip(emptyTooltip);

  const handleVariableClick = (varKey: string, clickIndex: number) => {
    if (!inputRef.current) return;

    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    let instanceCount = 0;
    let targetStart = -1;
    let targetCursor = -1;

    while ((match = regex.exec(value)) !== null) {
      if (match[1].trim() === varKey) {
        if (instanceCount === clickIndex) {
          targetStart = match.index;
          targetCursor = match.index + 2;
          break;
        }
        instanceCount++;
      }
    }

    if (targetCursor !== -1) {
      setClickedVariableStart(targetStart);
      inputRef.current.focus();
      inputRef.current.setSelectionRange(targetCursor, targetCursor);
      setManualSuggestions(true);
      handleVariableLeave();
    }
  };

  return (
    <div className="relative w-full">
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

      <VariableHighlight
        value={value}
        enabledVariables={enabledVariables}
        className={className}
        onVariableHover={handleVariableHover}
        onVariableLeave={handleVariableLeave}
        onVariableClick={handleVariableClick}
      />

      <VariableBadge variableCount={usedVariables.length} hasUndefinedVariables={hasUndefinedVariables} />

      <VariableTooltip
        show={tooltip.show}
        x={tooltip.x}
        y={tooltip.y}
        variableKey={tooltip.variableKey}
        variableValue={tooltip.variableValue}
        isSecret={tooltip.isSecret}
        environmentName={activeEnvironment?.name}
      />

      <VariableSuggestions
        ref={suggestionsRef}
        show={showSuggestions}
        variables={enabledVariables}
        currentVariable={currentVariable}
        onInsert={handleInsertVariable}
      />
    </div>
  );
}
