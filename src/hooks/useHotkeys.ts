import { useEffect, useRef } from 'react';

export type HotkeyHandler = (e: KeyboardEvent) => void;

/**
 * Registriert Tastenkürzel. Schlüssel sind `KeyboardEvent.key`-Werte
 * (z. B. "1", "Enter", "ArrowRight", "b"); Buchstaben ohne Beachtung der Groß-/Kleinschreibung.
 *
 * In Eingabefeldern werden nur die Tasten aus `allowInInputs` ausgelöst
 * (Standard: Enter und Escape), damit man z. B. Zahlen normal tippen kann.
 */
export function useHotkeys(
  handlers: Record<string, HotkeyHandler>,
  { enabled = true, allowInInputs = ['Enter', 'Escape'] }: { enabled?: boolean; allowInInputs?: string[] } = {},
) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      const inInput = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (target?.closest('dialog[open]')) return; // Dialoge bedienen sich selbst
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (inInput && !allowInInputs.includes(key)) return;
      // Enter auf fokussierten Buttons/Links nicht doppelt auslösen
      // (Ausnahme: Elemente mit data-hotkeys-enter, z. B. Antwortoptionen → Enter = „Prüfen/Weiter“)
      if (
        key === 'Enter' &&
        !inInput &&
        target &&
        (target.tagName === 'BUTTON' || target.tagName === 'A') &&
        !target.closest('[data-hotkeys-enter]')
      )
        return;
      const handler = ref.current[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, allowInInputs.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
}
