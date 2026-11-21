import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVariableDetection } from '../../hooks/useVariableDetection';
import type { RefObject } from 'react';

describe('useVariableDetection', () => {
  let input: HTMLInputElement;
  let suggestions: HTMLDivElement;
  let inputRef: RefObject<HTMLInputElement | null>;
  let suggestionsRef: RefObject<HTMLDivElement | null>;

  beforeEach(() => {
    input = document.createElement('input');
    suggestions = document.createElement('div');
    document.body.appendChild(input);
    document.body.appendChild(suggestions);
    inputRef = { current: input };
    suggestionsRef = { current: suggestions };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function renderDetection(value: string) {
    return renderHook(({ v }: { v: string }) => useVariableDetection(v, inputRef, suggestionsRef), {
      initialProps: { v: value },
    });
  }

  function primeInput(value: string) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
  }

  it('does not open suggestions for an unfocused input with an unclosed {{', () => {
    primeInput('http://localhost:4747?test={{');
    const { result } = renderDetection('http://localhost:4747?test={{');

    expect(result.current.showSuggestions).toBe(false);
  });

  it('opens suggestions when the focused input has an unclosed {{', () => {
    primeInput('http://localhost:4747?test={{');
    const { result } = renderDetection('http://localhost:4747?test={{');
    expect(result.current.showSuggestions).toBe(false);

    act(() => {
      input.focus();
    });
    expect(result.current.showSuggestions).toBe(true);
    expect(result.current.currentVariable).toBe('');
  });

  it('exposes the typed fragment as currentVariable for filtering', () => {
    primeInput('http://localhost:4747?test={{base');
    input.focus();
    const { result } = renderDetection('http://localhost:4747?test={{base');

    expect(result.current.showSuggestions).toBe(true);
    expect(result.current.currentVariable).toBe('base');
  });

  it('keeps suggestions open when focus moves into the suggestions panel', () => {
    primeInput('{{base');
    input.focus();
    const { result } = renderDetection('{{base');

    const insertButton = document.createElement('button');
    suggestions.appendChild(insertButton);
    act(() => {
      input.dispatchEvent(new FocusEvent('blur', { relatedTarget: insertButton }));
    });

    expect(result.current.showSuggestions).toBe(true);
  });

  it('closes suggestions when focus moves elsewhere', () => {
    primeInput('{{base');
    input.focus();
    const { result } = renderDetection('{{base');
    expect(result.current.showSuggestions).toBe(true);

    act(() => {
      input.dispatchEvent(new FocusEvent('blur'));
    });

    expect(result.current.showSuggestions).toBe(false);
  });

  it('does not open suggestions for a closed variable, even when focused', () => {
    primeInput('{{baseUrl}}');
    input.focus();
    const { result } = renderDetection('{{baseUrl}}');

    expect(result.current.showSuggestions).toBe(false);
  });
});
