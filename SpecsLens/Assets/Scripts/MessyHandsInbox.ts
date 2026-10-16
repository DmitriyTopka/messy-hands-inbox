/**
 * MessyHandsInbox - the single owner of inbox state.
 *
 * Owns: which messages exist, which one is open, and the strings the card
 * displays about them. Pure logic: no SceneObject, no component, no UI.
 *
 * Does NOT own: phase (idle/ready/sent) or timers - MessyHandsMain owns those.
 */

import {InboxMessage} from "./MessyHandsSampleMessages"

/** How much of the newest message the compact card shows. */
const SNIPPET_CHARS = 30

export class MessyHandsInbox {
  private items: InboxMessage[] = []
  private openIndex: number = -1

  load(messages: InboxMessage[]): void {
    this.items = messages.slice()
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

  /** "Mom: Are you coming on Sunday..." for the newest message. */
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

  /** Drops the open message from the inbox. */
  removeCurrent(): boolean {
    if (this.openIndex < 0 || this.openIndex >= this.items.length) return false
    this.items.splice(this.openIndex, 1)
    this.openIndex = -1
    return true
  }

  close(): void {
    this.openIndex = -1
  }
}
