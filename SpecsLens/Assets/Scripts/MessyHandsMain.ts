/**
 * MessyHandsMain - the orchestration table for the Messy Hands Inbox.
 *
 * Owns: the phase the experience is in, and the mapping from a command (a
 * pinched button or a spoken word) to a state change plus a push into the card.
 *
 * Does NOT own: the message data (MessyHandsInbox), how the card draws itself
 * (MessyHandsCardUI), or the chime (MessyHandsAudioController).
 *
 * Every command below is the single entry point for BOTH input routes: the
 * card's buttons call it, and MessyHandsVoiceController calls the same method
 * when speech recognition is available. That is why voice can fail without
 * costing the demo anything.
 *
 * @inputs: card + audio references (wired by the bootstrap), the sent-hold
 * duration, and the collider debug toggle.
 */

import {MessyHandsAudioController} from "./MessyHandsAudioController"
import {MessyHandsCardUI} from "./MessyHandsCardUI"
import {MessyHandsInbox} from "./MessyHandsInbox"
import {
  MessyHandsMemory,
  RememberedState,
  deviceStore,
  emptyState,
  hintLine,
} from "./MessyHandsMemory"
import {SAMPLE_MESSAGES} from "./MessyHandsSampleMessages"

/** Where the card is in the flow. */
export type MessyHandsPhase = "idle" | "ready" | "senders" | "message" | "draft" | "sent"

@component
export class MessyHandsMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">MessyHandsMain - inbox flow for busy hands</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The message card on the counter. Wired by the bootstrap.")
  card!: MessyHandsCardUI

  @input
  @hint("The arrival chime. Wired by the bootstrap.")
  audio!: MessyHandsAudioController
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(0.5, 6, 0.5))
  @hint('How long the card holds on "Sent" before returning to the summary.')
  sentHoldSeconds: number = 2

  @input
  @hint("Remember replied and cleared messages between Lens sessions. Off means every start is a fresh three-message inbox.")
  rememberBetweenSessions: boolean = true

  @input
  @hint("Wireframe every collider in the scene, to check the card's hit zones. Takes effect on preview restart.")
  debugColliders: boolean = false
  @ui.group_end

  private inbox = new MessyHandsInbox()
  private memory = new MessyHandsMemory(null)
  private phase: MessyHandsPhase = "idle"
  private sentTimer: DelayedCallbackEvent | null = null

  /**
   * onAwake only touches this component. MessyHandsMain sits ABOVE the card in
   * the hierarchy, so it awakes first - reaching into the card's event getters
   * here reads them off a component that is not awake yet and they come back
   * undefined. All cross-script work waits for OnStartEvent.
   */
  onAwake(): void {
    const timer = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    timer.bind(() => this.returnToCompact())
    this.sentTimer = timer

    // Storage is a global system, not another component, so it is safe here.
    // A runtime without it hands back null and the Lens simply forgets.
    this.memory = new MessyHandsMemory(this.rememberBetweenSessions ? deviceStore() : null)

    this.createEvent("OnStartEvent").bind(() => this.begin())
  }

  /**
   * The sample messages are waiting the moment the Lens comes up, so the card
   * reads its count straight away. One chime marks the arrival.
   *
   * "The sample messages", not "the three": anything replied to or thrown away
   * in a previous session is still known, so a second run can legitimately open
   * on two messages and a line saying why.
   */
  private begin(): void {
    if (!this.card || !this.audio) {
      console.error(
        "[MessyHandsMain] card or audio @input is not wired. Re-run the bootstrap's input-wiring phase."
      )
      return
    }

    this.card.onStart.add(() => this.commandStart())
    this.card.onWhoWrote.add(() => this.commandWhoWrote())
    this.card.onSenderSelected.add((index: number) => this.commandOpenIndex(index))
    this.card.onSpeak.add(() => this.commandSpeak())
    this.card.onSend.add(() => this.commandSend())
    this.card.onRemove.add(() => this.commandRemove())

    if (this.debugColliders) {
      this.setColliderDebugAll(this.getSceneObject(), true)
    }

    const remembered = this.memory.load()
    this.inbox.load(SAMPLE_MESSAGES, remembered)
    this.phase = "idle"
    this.card.setReady(false)
    this.card.setHeader(this.inbox.headerLine())
    this.card.setMemoryHint(hintLine(remembered))
    this.card.showIdle(this.inbox.snippet())
    this.audio.playChime()
    console.log(
      "[MessyHandsMain] idle with " +
        this.inbox.count +
        " messages waiting; remembered " +
        remembered.sent.length +
        " replied, " +
        remembered.removed.length +
        " cleared"
    )
  }

  // ═══ Commands - one per voice word / card button ══════════════════════════

  /** "start" / the Start button: the dot goes green and the Lens is listening. */
  commandStart(): void {
    if (this.phase !== "idle") return
    this.phase = "ready"
    this.card.setReady(true)
    this.card.showCompact(this.inbox.snippet())
    console.log("[MessyHandsMain] ready")
  }

  /** "who wrote" / the Who wrote button: the sender list. */
  commandWhoWrote(): void {
    if (this.phase === "idle" || this.phase === "sent") return
    if (this.inbox.count === 0) {
      this.returnToCompact()
      return
    }
    this.inbox.close()
    this.phase = "senders"
    this.card.showSenderList(this.inbox.senders())
    console.log("[MessyHandsMain] senders: " + this.inbox.senders().join(", "))
  }

  /**
   * A sender's name spoken, or that row pinched.
   *
   * Returns whether a message was actually opened, so callers can tell a
   * refused command from a performed one.
   */
  commandOpenIndex(index: number): boolean {
    if (this.phase !== "senders") return false
    if (!this.inbox.openAt(index)) return false
    const m = this.inbox.current()
    if (!m) return false
    this.phase = "message"
    this.card.showMessage(m.sender, m.text, this.inbox.currentWasSent())
    console.log("[MessyHandsMain] opened " + m.sender)
    return true
  }

  /**
   * Opens a message by sender name - the route the voice controller uses.
   *
   * Returns whether a message was OPENED, not whether the name was recognised.
   * It used to return true as soon as a name matched, even when the phase guard
   * had refused the open - so "Mom" spoken at the idle card reported success
   * and nothing happened. Nothing depended on that return yet, which is exactly
   * why it survived: the voice controller ignores it. A LEAF scenario asking
   * "are out-of-phase commands really ignored?" is what found it.
   */
  commandOpenSender(name: string): boolean {
    const senders = this.inbox.senders()
    const wanted = name.trim().toLowerCase()
    for (let i = 0; i < senders.length; i++) {
      if (senders[i].toLowerCase() === wanted) {
        return this.commandOpenIndex(i)
      }
    }
    return false
  }

  /**
   * The gist spoken, or the Speak button pinched. The stand-in fills in the
   * baked gist and shows what the rewrite made of it.
   */
  commandSpeak(): void {
    if (this.phase !== "message") return
    const m = this.inbox.current()
    if (!m) return
    this.phase = "draft"
    // Quoted, not labelled "You said:". At the card's new type size that label
    // cost a whole wrapped line and pushed the draft under the button row; the
    // quotes carry the same meaning in two characters.
    this.card.showDraft(m.sender, "\u201c" + m.gist + "\u201d", m.reply)
    console.log("[MessyHandsMain] draft ready for " + m.sender)
  }

  /** "send" / the Send button. Shows a sent state only; nothing leaves the Lens. */
  commandSend(): void {
    if (this.phase !== "draft") return
    const m = this.inbox.current()
    if (!m) return
    this.phase = "sent"
    this.inbox.markCurrentSent()
    this.memory.save(this.inbox.snapshot())
    this.card.showSent(m.reply)
    console.log("[MessyHandsMain] sent to " + m.sender + ", remembered as replied")
    if (this.sentTimer) this.sentTimer.reset(this.sentHoldSeconds)
  }

  /** "remove" / the Remove button: that message disappears. */
  commandRemove(): void {
    if (this.phase !== "message" && this.phase !== "draft") return
    const m = this.inbox.current()
    if (!m) return
    if (!this.inbox.removeCurrent()) return
    this.memory.save(this.inbox.snapshot())
    console.log("[MessyHandsMain] removed " + m.sender + ", " + this.inbox.count + " left")
    this.returnToCompact()
  }

  /**
   * Puts the inbox back to three unread messages, waiting to be started, AND
   * forgets everything a previous session remembered.
   *
   * Reset has to clear storage too, or it would not be a reset: the inbox would
   * come straight back to two messages on the next Lens start. It is also what
   * lets the LEAF suite stay deterministic now that state survives restarts -
   * every scenario calls this first, so none of them inherit either the
   * previous scenario's state or a leftover demo from yesterday.
   */
  resetDemo(): void {
    if (!this.card) return
    this.memory.forget()
    this.inbox.load(SAMPLE_MESSAGES, emptyState())
    this.phase = "idle"
    this.card.setReady(false)
    this.card.setHeader(this.inbox.headerLine())
    this.card.setMemoryHint("")
    this.card.showIdle(this.inbox.snippet())
    console.log("[MessyHandsMain] reset to idle with " + this.inbox.count + " messages, memory cleared")
  }

  /** Current phase - read by the voice controller and by tests. */
  getPhase(): MessyHandsPhase {
    return this.phase
  }

  /** Sender names in list order - read by the voice controller and by tests. */
  getSenders(): string[] {
    return this.inbox.senders()
  }

  /** What is currently held for the next Lens start. Read by tests. */
  getRemembered(): RememberedState {
    return this.inbox.snapshot()
  }

  /** What the store itself holds right now, not what this run believes. Read by tests. */
  getStoredState(): RememberedState {
    return this.memory.load()
  }

  /** The memory object, so tests can ask whether this runtime can remember at all. */
  getMemory(): MessyHandsMemory {
    return this.memory
  }

  /** The line the card shows about a remembered session, or "". Read by tests. */
  getMemoryHint(): string {
    return hintLine(this.inbox.snapshot())
  }

  /**
   * Re-runs exactly what the Lens does on start, against whatever the store
   * holds now. This is the restore path a refresh takes, minus the process
   * restart - see the memory scenarios.
   */
  reloadFromMemory(): RememberedState {
    const remembered = this.memory.load()
    this.inbox.load(SAMPLE_MESSAGES, remembered)
    this.phase = "idle"
    this.card.setReady(false)
    this.card.setHeader(this.inbox.headerLine())
    this.card.setMemoryHint(hintLine(remembered))
    this.card.showIdle(this.inbox.snippet())
    console.log("[MessyHandsMain] reloaded from memory with " + this.inbox.count + " messages")
    return remembered
  }

  private returnToCompact(): void {
    this.inbox.close()
    this.phase = "ready"
    this.card.setHeader(this.inbox.headerLine())
    this.card.showCompact(this.inbox.snippet())
  }

  // Walks the tree and toggles debugDrawEnabled on every collider, so the
  // card's tap targets can be checked against what is drawn. BodyComponent is
  // fetched separately: getComponent('Physics.ColliderComponent') does not
  // return BodyComponents even though BodyComponent extends ColliderComponent.
  private setColliderDebugAll(obj: SceneObject, enable: boolean): void {
    const c = obj.getComponent("Physics.ColliderComponent") as ColliderComponent | null
    if (c) c.debugDrawEnabled = enable
    const b = obj.getComponent("Physics.BodyComponent") as ColliderComponent | null
    if (b) b.debugDrawEnabled = enable
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      this.setColliderDebugAll(obj.getChild(i), enable)
    }
  }
}
