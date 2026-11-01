import { Injectable, computed, inject, signal } from '@angular/core';
import { ChallengeRecord, ConsentStatus, PlayerState, RewardSummary } from '../models/player-state.model';
import { Mission } from '../models/mission.model';
import { firstUnlocked, isPathUnlocked } from '../utils/path-lock';
import { levelFromXp, xpForLevel } from '../utils/progress';
import { STATE_VERSION, exportState, migrateState, parseExport } from '../utils/state-migrations';
import { ContentRegistryService } from './content-registry.service';

const STATE_KEY = 'pixelademy.player.v1';
const CONSENT_KEY = 'pixelademy.consent.v1';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly registry = inject(ContentRegistryService);

  readonly consent = signal<ConsentStatus>('unknown');
  readonly state = signal<PlayerState>(this.initialState());
  /** Ultima missione completata in questa sessione: la mappa ci parte per far camminare l'eroe fino alla successiva. */
  readonly lastCompletedId = signal<string | null>(null);

  readonly liked = computed(() => this.state().liked);
  readonly xp = computed(() => this.state().xp);
  /** XP guadagnati nel livello attuale e XP che servono per completarlo (gli stessi numeri ovunque). */
  readonly xpInto = computed(() => this.state().xp - xpForLevel(this.state().level));
  readonly xpSpan = computed(() => xpForLevel(this.state().level + 1) - xpForLevel(this.state().level));
  readonly level = computed(() => this.state().level);
  readonly selectedPath = computed(() => this.registry.path(this.state().selectedPathId));
  readonly selectedCharacter = computed(() => this.registry.character(this.state().selectedCharacterId));
  /** Percentuale di avanzamento verso il livello successivo (0..100). */
  readonly levelProgress = computed(() => {
    const { xp, level } = this.state();
    const from = xpForLevel(level);
    return Math.round(((xp - from) / (xpForLevel(level + 1) - from)) * 100);
  });

  constructor() {
    const consent = this.read(CONSENT_KEY);
    if (consent === 'granted' || consent === 'denied') this.consent.set(consent);
    if (consent === 'granted') {
      this.state.set(this.normalize(this.readState()));
      this.persist(); // il salvataggio si riscrive subito nella versione corrente (campi vecchi scartati, dati rovinati riparati)
    }
  }

  acceptSaving(): void {
    this.consent.set('granted');
    this.write(CONSENT_KEY, 'granted');
    this.persist();
  }

  /** Uso senza salvataggio: lo stato resta solo in memoria. */
  declineSaving(): void {
    this.consent.set('denied');
    this.remove(STATE_KEY);
    this.write(CONSENT_KEY, 'denied');
  }

  /** Cancella ogni dato salvato dal browser (stato e consenso) e riparte subito da zero, senza bisogno di ricaricare. */
  clearStoredData(): void {
    this.remove(STATE_KEY);
    this.remove(CONSENT_KEY);
    this.consent.set('unknown');
    this.state.set(this.initialState());
  }

  markLiked(): void {
    this.state.update((s) => ({ ...s, liked: true }));
    this.persist();
  }

  /** Ricorda la lingua scelta (si salva solo con il consenso, come il resto). */
  setLocale(locale: 'it' | 'en'): void {
    this.update({ locale });
  }

  /**
   * Classifica locale: registra il risultato di una sfida se è il migliore (più XP; a parità, meno secondi).
   * Ritorna `true` se è un nuovo record. Rigiocare una sfida può migliorare il record ma non dà altri XP.
   */
  recordResult(missionId: string, rec: ChallengeRecord): boolean {
    const best = this.state().records[missionId];
    if (best && (rec.xp < best.xp || (rec.xp === best.xp && rec.seconds >= best.seconds))) return false;
    this.update({ records: { ...this.state().records, [missionId]: rec } });
    return true;
  }

  /** Tiene solo i record ben formati di missioni che esistono. */
  private validRecords(raw: unknown, ids: Set<string>): Record<string, ChallengeRecord> {
    if (!raw || typeof raw !== 'object') return {};
    const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    return Object.fromEntries(
      Object.entries(raw as Record<string, Partial<ChallengeRecord>>).filter(
        ([id, r]) => ids.has(id) && !!r && num(r.xp) && num(r.seconds) && num(r.errors) && num(r.at),
      ),
    ) as Record<string, ChallengeRecord>;
  }

  resetProgress(): void {
    this.state.set(this.initialState());
    this.persist();
  }

  /** I progressi come file JSON (con versione), per salvarli o trasferirli. */
  exportProgress(): string {
    return exportState(this.state());
  }

  /** Ripristina i progressi da un file esportato (anche di una versione precedente). `false` se il file non è valido. */
  importProgress(text: string): boolean {
    const parsed = parseExport(text);
    if (!parsed) return false;
    this.state.set(this.normalize(parsed));
    this.persist();
    return true;
  }

  isCompleted(missionId: string): boolean {
    return this.state().completedMissionIds.includes(missionId);
  }

  selectPath(pathId: string): void {
    const path = this.registry.path(pathId);
    if (!path || !isPathUnlocked(path, this.registry.paths(), new Set(this.state().completedMissionIds))) return;
    const char = path.defaultCharacterId ?? this.state().selectedCharacterId;
    this.update({ selectedPathId: pathId, selectedCharacterId: char });
  }

  isCharacterUnlocked(characterId: string): boolean {
    const c = this.registry.character(characterId);
    return !!c && c.unlockLevel <= this.state().level;
  }

  selectCharacter(characterId: string): void {
    if (this.isCharacterUnlocked(characterId)) this.update({ selectedCharacterId: characterId });
  }

  /** `opts.xp` sostituisce gli XP base (tempo, errori, somiglianza); `opts.code` è il pezzo di progetto. */
  completeMission(mission: Mission, opts: { xp?: number; code?: string } = {}): RewardSummary {
    const s = this.state();
    if (s.completedMissionIds.includes(mission.id)) return { gainedXp: 0, newLevel: null, firstTime: false };
    const gainedXp = opts.xp ?? mission.xp;
    const xp = s.xp + gainedXp;
    const level = levelFromXp(xp);
    this.update({
      xp,
      level,
      completedMissionIds: [...s.completedMissionIds, mission.id],
      solvedCode: opts.code ? { ...s.solvedCode, [mission.id]: opts.code } : s.solvedCode,
    });
    this.lastCompletedId.set(mission.id);
    return { gainedXp, newLevel: level > s.level ? level : null, firstTime: true };
  }

  private update(patch: Partial<PlayerState>): void {
    this.state.update((s) => ({ ...s, ...patch }));
    this.persist();
  }

  private initialState(): PlayerState {
    const path = firstUnlocked(this.registry.paths(), new Set());
    return {
      schemaVersion: STATE_VERSION,
      xp: 0,
      level: 1,
      completedMissionIds: [],
      solvedCode: {},
      liked: false,
      records: {},
      selectedPathId: path?.id ?? '',
      selectedCharacterId: path?.defaultCharacterId ?? this.registry.characters()[0]?.id ?? '',
    };
  }

  /** Ripara uno stato salvato che riferisce contenuti non più esistenti. */
  private normalize(stored: unknown): PlayerState {
    const base = this.initialState();
    const raw = migrateState(stored);
    if (!raw) return base;
    const xp = Math.max(0, Number(raw.xp) || 0);
    const ids = new Set(this.registry.missions().map((m) => m.id));
    const completed = (raw.completedMissionIds ?? []).filter((id) => ids.has(id));
    // un percorso salvato come scelto ma ancora bloccato (o sparito) lascia il posto al primo sbloccato
    const saved = this.registry.path(raw.selectedPathId ?? '');
    const path = saved && isPathUnlocked(saved, this.registry.paths(), new Set(completed)) ? saved : firstUnlocked(this.registry.paths(), new Set(completed));
    return {
      schemaVersion: STATE_VERSION,
      xp,
      level: levelFromXp(xp),
      completedMissionIds: completed,
      solvedCode: Object.fromEntries(
        Object.entries(raw.solvedCode ?? {}).filter(([id, code]) => ids.has(id) && typeof code === 'string'),
      ),
      liked: raw.liked === true,
      records: this.validRecords(raw.records, ids),
      ...(raw.locale === 'it' || raw.locale === 'en' ? { locale: raw.locale } : {}),
      selectedPathId: path?.id ?? base.selectedPathId,
      selectedCharacterId: this.registry.character(raw.selectedCharacterId ?? '')?.id ?? base.selectedCharacterId,
    };
  }

  private persist(): void {
    if (this.consent() === 'granted') this.write(STATE_KEY, JSON.stringify(this.state()));
  }

  private readState(): unknown {
    try {
      return JSON.parse(this.read(STATE_KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private write(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* storage non disponibile */ }
  }
  private remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* storage non disponibile */ }
  }
}
