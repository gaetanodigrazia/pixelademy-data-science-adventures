import { ComponentRef, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { gameConfig, ProjectSpec } from '../content/adventure-core/concepts';
import { MINI_PACK } from './mini-pack';

/** Progetto di prova (dati del primo percorso) per configurare i minigiochi nei test. */
export const SAMPLE: ProjectSpec = {
  heading: 'BOLLETTINO DI PROVA',
  a: { name: 'temperature', label: 'Temperature', unit: '°C', values: [17, 19, 22, 28, 31, 26, 21] },
  b: { name: 'pioggia', label: 'Pioggia', unit: 'mm', values: [0, 2, 5, 0, 1, 7, 3] },
  c: { name: 'vento', label: 'Vento', unit: 'km/h', values: [12, 35, 48, 22, 61, 30, 55] },
  k: 3, cut: 40, cutName: 'soglia_vento', alert: 22,
  registry: { name: 'venti', entries: { nord: 18, est: 27, sud: 34, ovest: 21 }, key: 'sud', unit: 'km/h' },
  extreme: 'min',
  labels: { first: 'Prima', count: 'Conteggio', filtered: 'Filtrati', total: 'Totale', mean: 'Media', alert: 'Allerta', key: 'Chiave', extreme: 'Estremo', range: 'Escursione', final: 'Finale' },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Game = any; // i giochi espongono lo stato come membri protected: i test li pilotano come farebbe un giocatore

/** Monta il minigioco del concetto `index` (0..9) con la configurazione che gli darebbe la missione. */
export function mountGame<T>(component: Type<T>, index: number, onCleared: () => void = () => undefined) {
  const fixture = TestBed.createComponent(component);
  const ref = fixture.componentRef as ComponentRef<unknown>;
  ref.setInput('character', MINI_PACK.characters[0]);
  ref.setInput('config', { level: index + 1, ...gameConfig(index, SAMPLE) });
  ref.setInput('onCleared', onCleared);
  fixture.detectChanges();
  return { fixture, g: fixture.componentInstance as Game, el: fixture.nativeElement as HTMLElement };
}
