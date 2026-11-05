/**
 * MessyHandsMemory - what the inbox still knows after the Lens is closed.
 *
 * Owns: reading and writing the two string arrays that survive a restart, and
 * the one short line the card shows about them. Nothing else. No SceneObject,
 * no component, no decisions about the flow.
 *
 * Why two arrays and not one blob: putStringArray / getStringArray are the only
 * persistent-storage calls this needs, they are on GeneralDataStore in every
 * Lens Scripting version this project targets, and a list of ids is readable
 * straight out of the store when something looks wrong. A JSON blob in a single
 * string would have been one key instead of two and unreadable in the debugger.
 *
 * The store is injected rather than reached for, so the LEAF suite can drive
 * this class over a fake store without writing to the real one - and so a
 * runtime where global.persistentStorageSystem is missing degrades to a Lens
 * that simply forgets, instead of a Lens that throws on start.
 */

/** The only part of GeneralDataStore this class touches. */
export interface MemoryStore {
  has(key: string): boolean
  getStringArray(key: string): string[]
  putStringArray(key: string, value: string[]): void
  remove(key: string): void
}

/** What survived the restart, by message id. */
export interface RememberedState {
  /** Ids the user already replied to. They come back, marked. */
  sent: string[]
  /** Ids the user threw away. They do not come back at all. */
  removed: string[]
}

const KEY_SENT = "messyhands.sent"
const KEY_REMOVED = "messyhands.removed"

/** Nothing remembered - the state a first run, or a reset, starts from. */
export function emptyState(): RememberedState {
  return {sent: [], removed: []}
}

/**
 * An in-memory stand-in for GeneralDataStore.
 *
 * Used by the LEAF memory scenarios so they can prove the read/write/forget
 * cycle without touching what the real demo remembers between runs.
 */
export class FakeMemoryStore implements MemoryStore {
  private data: Record<string, string[]> = {}

  has(key: string): boolean {
    return this.data[key] !== undefined
  }

  getStringArray(key: string): string[] {
    const held = this.data[key]
    return held ? held.slice() : []
  }

  putStringArray(key: string, value: string[]): void {
    this.data[key] = value.slice()
  }

  remove(key: string): void {
    delete this.data[key]
  }

  /** Test helper: every key currently held. */
  keys(): string[] {
    return Object.keys(this.data)
  }
}

/**
 * The real store, or null when this runtime has no persistent storage.
 *
 * Never throws: a Lens that cannot remember is a working Lens that starts
 * fresh every time, which is strictly better than one that fails to start.
 */
export function deviceStore(): MemoryStore | null {
  try {
    const system = global.persistentStorageSystem
    if (!system || !system.store) return null
    return system.store as unknown as MemoryStore
  } catch (e) {
    console.log("[MessyHandsMemory] no persistent storage here, starting fresh: " + e)
    return null
  }
}

export class MessyHandsMemory {
  /** null means "this runtime forgets"; every method below stays safe. */
  constructor(private store: MemoryStore | null) {}

  /** True when there is somewhere to write. */
  get available(): boolean {
    return this.store !== null
  }

  /** What the last session left behind. Empty on a first run or after forget(). */
  load(): RememberedState {
    if (!this.store) return emptyState()
    try {
      return {
        sent: this.store.has(KEY_SENT) ? this.store.getStringArray(KEY_SENT).slice() : [],
        removed: this.store.has(KEY_REMOVED)
          ? this.store.getStringArray(KEY_REMOVED).slice()
          : [],
      }
    } catch (e) {
      console.log("[MessyHandsMemory] could not read, starting fresh: " + e)
      return emptyState()
    }
  }

  /** Writes both arrays. Called after every send and every remove. */
  save(state: RememberedState): void {
    if (!this.store) return
    try {
      this.store.putStringArray(KEY_SENT, state.sent.slice())
      this.store.putStringArray(KEY_REMOVED, state.removed.slice())
    } catch (e) {
      console.log("[MessyHandsMemory] could not write: " + e)
    }
  }

  /**
   * Drops both keys, so the next load() is a first run.
   *
   * remove(), not clear(): clear() wipes the whole data store, which on a real
   * device is shared with anything else the Lens ever saved. Reset means "forget
   * this demo", not "forget everything".
   */
  forget(): void {
    if (!this.store) return
    try {
      this.store.remove(KEY_SENT)
      this.store.remove(KEY_REMOVED)
    } catch (e) {
      console.log("[MessyHandsMemory] could not forget: " + e)
    }
  }

  /** True when either key is present - i.e. a previous session wrote something. */
  hasAnything(): boolean {
    if (!this.store) return false
    try {
      return this.store.has(KEY_SENT) || this.store.has(KEY_REMOVED)
    } catch (e) {
      return false
    }
  }
}

/**
 * The one line the card shows about what it remembered, or "" for a clean start.
 *
 * Kept out of the class so the LEAF readability and wording checks can call it
 * with made-up state and no store at all.
 */
export function hintLine(state: RememberedState): string {
  const replied = state.sent.length
  const cleared = state.removed.length
  if (replied === 0 && cleared === 0) return ""

  // "replied" and "cleared" read the same for one or many, so no plural branch.
  //
  // "Last time:" and not "From last time:": at Body size on a 22 cm card the
  // longer prefix put the full line right on the plate's edge in the preview.
  // Five characters shorter buys a visible margin and says the same thing.
  const parts: string[] = []
  if (replied > 0) parts.push(replied + " replied")
  if (cleared > 0) parts.push(cleared + " cleared")
  return "Last time: " + parts.join(", ")
}
