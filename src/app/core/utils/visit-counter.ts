import { CounterResponse, CounterStore, handleCounter } from './counter';

export const VISIT_KEY = 'totale';

/** Contatore di visite anonimo: stesso meccanismo dei «Mi piace» (un numero, niente altro). `netlify/functions/visite.ts` la usa così com'è. */
export const handleVisit = (method: string, store: CounterStore): Promise<CounterResponse> => handleCounter(method, store, VISIT_KEY);
