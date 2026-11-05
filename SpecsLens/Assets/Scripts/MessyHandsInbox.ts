/**
 * MessyHandsInbox - the single owner of inbox state.
 *
 * Owns: which messages exist, which one is open, which ones were already
 * replied to, and the strings the card displays about them. Pure logic: no
 * SceneObject, no component, no UI, no storage.
 *
 * Does NOT own: phase (idle/ready/sent) or timers - MessyHandsMain owns those.
 * Does NOT own: writing to disk - MessyHandsMemory does that. This class only
 * reports what should be written, through sentIds() / removedIds().
 *
 * The two remembered sets behave differently on purpose:
 *   removed - the user threw it away, so it never comes back.
 *   sent    - the user replied, so it DOES come back, marked as replied. The
 *             demo never really sends anything, and silently deleting a message
 *             the user only answered would lose the thread.
 */

import {RememberedState, emptyState} from "./MessyHandsMemory"
import {InboxMessage} from "./MessyHandsSampleMessages"

/** How much of the newest message the compact card shows. */
const SNIPPET_CHARS = 30

export class MessyHandsInbox {
  private items: InboxMessage[] = []
  private openIndex: number = -1
  private sent: string[] = []
  private removed: string[] = []

  /**
   * Fills the inbox, honouring what a previous session left behind.
   *
   * Pass nothing (or an empty state) for a clean three-message demo, which is
   * what resetDemo() and every LEAF scenario do.
   */
  load(messages: InboxMessage[], remembered?: RememberedState): void {
    const state = remembered ?? emptyState()
    this.sent = state.sent.slice()
    this.removed = state.removed.slice()

    this.items = []
    for (const m of messages) {
      if (this.removed.indexOf(m.id) === -1) this.items.push(m)
    }
    this.openIndex = -1
  }

  get count(): number {
    return this.items.length
  }

  /** "3 messages" / "1 message" / "No messages" - the card's header line. */
  headerLine(): string {
    if (this.items.length === 0) return "No messages"
    if (this.items.length === 1) return "1 message"
    return this.items.length + " messages"
  }

  senders(): string[] {
    const out: string[] = []
    for (const m of this.items) out.push(m.sender)
    return out
  }

  /**
   * "Mom: Are you coming on Sunday..." for the newest message.
   *
   * SNIPPET_CHARS is what keeps a long message from pushing the button row off
   * the card: the compact pane gives the snippet one wrapped row, and an
   * untruncated 80-character body overflows it.
   */
  snippet(): string {
    if (this.items.length === 0) return "Nothing waiting for you."
    const m = this.items[0]
    let body = m.text
    if (body.length > SNIPPET_CHARS) {
      body = body.substring(0, SNIPPET_CHARS).trim() + "..."
    }
    return m.sender + ": " + body
  }

  /** Opens a message by its row in the sender list. */
  openAt(index: number): boolean {
    if (index < 0 || index >= this.items.length) return false
    this.openIndex = index
    return true
  }

  current(): InboxMessage | null {
    if (this.openIndex < 0 || this.openIndex >= this.items.length) return null
    return this.items[this.openIndex]
  }

  /** True when the open message was already replied to, in this run or a past one. */
  currentWasSent(): boolean {
    const m = this.current()
    if (!m) return false
    return this.sent.indexOf(m.id) !== -1
  }

  /**
   * Marks the open message as replied to. Does not drop it from the inbox -
   * nothing is really sent, so the thread stays readable.
   */
  markCurrentSent(): boolean {
    const m = this.current()
    if (!m) return false
    if (this.sent.indexOf(m.id) === -1) this.sent.push(m.id)
    return true
  }

  /** Drops the open message from the inbox, and remembers that it is gone. */
  removeCurrent(): boolean {
    if (this.openIndex < 0 || this.openIndex >= this.items.length) return false
    const m = this.items[this.openIndex]
    if (this.removed.indexOf(m.id) === -1) this.removed.push(m.id)
    this.items.splice(this.openIndex, 1)
    this.openIndex = -1
    return true
  }

  close(): void {
    this.openIndex = -1
  }

  /** Exactly what MessyHandsMemory should write. */
  snapshot(): RememberedState {
    return {sent: this.sent.slice(), removed: this.removed.slice()}
  }

  sentIds(): string[] {
    return this.sent.slice()
  }

  removedIds(): string[] {
    return this.removed.slice()
  }
}
