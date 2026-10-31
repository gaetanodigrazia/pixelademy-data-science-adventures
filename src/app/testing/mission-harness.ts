import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { App } from '../app';
import { routes } from '../app.routes';
import { PACKS } from '../core/data/packs.generated';
import { PythonRunnerService } from '../core/services/python-runner.service';
import { CodeEditor } from '../shared/components/code-editor';

export const path = PACKS[0].paths[0];

export const btn = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
/** Un pulsante dentro la modale aperta (a differenza di `btn`, non confonde pulsanti omonimi della pagina sotto). */
export const dialogBtn = (el: HTMLElement, text: string) =>
  Array.from(el.querySelector('[role=dialog]')?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

/** Prepara il TestBed con il router e un Python finto (nessun download dalla CDN). */
export function setup() {
  localStorage.clear();
  sessionStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  const python = TestBed.inject(PythonRunnerService);
  vi.spyOn(python, 'loadRuntime').mockResolvedValue(undefined);
  const run = vi.spyOn(python, 'run').mockResolvedValue({ output: '' });
  return { run };
}

/** Apre la pagina della missione e chiude la presentazione del progetto, come farebbe il giocatore. */
export async function openMission(id: string) {
  const f = TestBed.createComponent(App);
  await TestBed.inject(Router).navigateByUrl(`/missione/${id}`);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const start = btn(f.nativeElement, 'Comincia');
  if (start) { start.click(); f.detectChanges(); }
  return { f, el: f.nativeElement as HTMLElement };
}

/** Vince il minigioco della battaglia (la sua logica è già testata dai giochi) e apre il task dal modale di vittoria. */
export function goToTask(f: ComponentFixture<unknown>) {
  const el = f.nativeElement as HTMLElement;
  btn(el, 'Salta la teoria').click();
  f.detectChanges();
  const game = f.debugElement.query(By.css('.game-host')).componentInstance;
  game.win();
  f.detectChanges();
  dialogBtn(el, 'Vai al task').click();
  f.detectChanges();
}

/** Esegue nell'editor il codice dato (ciò che emette «Esegui codice») e attende la fine dell'esecuzione. */
export async function runCode(f: ComponentFixture<unknown>, code: string) {
  f.debugElement.query(By.directive(CodeEditor)).componentInstance.runCode.emit(code);
  await f.whenStable();
  f.detectChanges();
}

export const expectedOutput = (i: number): string => (path.missions[i].validation as { expected: string[] }).expected.join('\n') + '\n';
