import { ValidationResult, ValidationSpec } from '../models/mission.model';

const NUMBER_RE = /-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi;

/** Validazione deterministica dell'output già prodotto dal runner Pyodide: non esegue codice. */
export function validateOutput(output: string, spec: ValidationSpec): ValidationResult {
  const text = output.trim();
  if (!text) {
    return { ok: false, message: 'Nessun output: usa print() per mostrare il risultato.' };
  }
  if (spec.kind === 'lines') {
    const got = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const diff = spec.expected.findIndex((line, i) => got[i] !== line);
    if (diff < 0 && got.length === spec.expected.length) return { ok: true, message: 'Bollettino corretto!' };
    if (diff >= 0 && diff < got.length) return { ok: false, message: `La riga ${diff + 1} del bollettino non è corretta: la console mostra «${got[diff].slice(0, 50)}».` };
    return got.length < spec.expected.length
      ? { ok: false, message: `Il bollettino ha ${got.length} righe, ma ne servono ${spec.expected.length}.` }
      : { ok: false, message: `Il bollettino ha ${got.length} righe: ne servono ${spec.expected.length}, togli quelle in più.` };
  }
  if (spec.kind === 'text') {
    const got = text.toLowerCase();
    return got === spec.expected.toLowerCase()
      ? { ok: true, message: 'Risultato corretto!' }
      : { ok: false, message: `Output non corretto: la console mostra «${text.slice(0, 40)}».` };
  }
  const tokens = text.match(NUMBER_RE);
  if (!tokens) {
    return { ok: false, message: 'Il risultato deve essere numerico: nell\'output non ci sono numeri.' };
  }
  if (text.replace(NUMBER_RE, '').replace(/[\s,[\]()]/g, '') !== '') {
    return { ok: false, message: 'Stampa soltanto il valore richiesto, senza testo aggiuntivo.' };
  }
  const tol = spec.tolerance ?? 0.01;
  const got = tokens.map(Number);
  if (got.length !== spec.expected.length) {
    return {
      ok: false,
      message: `Ti aspettavo ${spec.expected.length} valore/i, ma ne ho trovati ${got.length}.`,
    };
  }
  const okAll = got.every((g, i) => Math.abs(g - spec.expected[i]) <= tol);
  return okAll
    ? { ok: true, message: 'Risultato corretto!' }
    : { ok: false, message: 'Il risultato numerico non è quello atteso: ricontrolla il calcolo.' };
}
