import { CounterResponse, CounterStore, handleCounter } from './counter';

export type { CounterStore };
export const LIKE_KEY = 'totale';
export type LikeResponse = CounterResponse;

/** «Mi piace» anonimo: un contatore (vedi `counter.ts`). La funzione di Netlify (`netlify/functions/mi-piace.ts`) la usa così com'è. */
export const handleLike = (method: string, store: CounterStore): Promise<LikeResponse> => handleCounter(method, store, LIKE_KEY);
