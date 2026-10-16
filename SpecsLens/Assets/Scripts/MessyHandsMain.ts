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
  @hint("Wireframe every collider in the scene, to check the card's hit zones. Takes effect on preview restart.")
  debugColliders: boolean = false
  @ui.group_end

  private inbox = new MessyHandsInbox()
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

    this.createEvent("OnStartEvent").bind(() => this.begin())
  }

  /**
   * The three sample messages are waiting the moment the Lens comes up, so the
   * card reads its count straight away. One chime marks the arrival.
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

    this.inbox.load(SAMPLE_MESSAGES)
    this.phase = "idle"
    this.card.setReady(false)
    this.card.setHeader(this.inbox.headerLine())
    this.card.showIdle(this.inbox.snippet())
    this.audio.playChime()
    console.log("[MessyHandsMain] idle with " + this.inbox.count + " messages waiting")
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

  /** A sender's name spoken, or that row pinched. */
  commandOpenIndex(index: number): void {
    if (this.phase !== "senders") return
    if (!this.inbox.openAt(index)) return
    const m = this.inbox.current()
    if (!m) return
    this.phase = "message"
    this.card.showMessage(m.sender, m.text)
    console.log("[MessyHandsMain] opened " + m.sender)
  }

  /** Opens a message by sender name - the route the voice controller uses. */
  commandOpenSender(name: string): boolean {
    const senders = this.inbox.senders()
    const wanted = name.trim().toLowerCase()
    for (let i = 0; i < senders.length; i++) {
      if (senders[i].toLowerCase() === wanted) {
        this.commandOpenIndex(i)
        return true
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
    this.card.showDraft(m.sender, "You said: " + m.gist, m.reply)
    console.log("[MessyHandsMain] draft ready for " + m.sender)
  }

  /** "send" / the Send button. Shows a sent state only; nothing leaves the Lens. */
  commandSend(): void {
    if (this.phase !== "draft") return
    const m = this.inbox.current()
    if (!m) return
    this.phase = "sent"
    this.card.showSent(m.reply)
    console.log("[MessyHandsMain] sent to " + m.sender)
    if (this.sentTimer) this.sentTimer.reset(this.sentHoldSeconds)
  }

  /** "remove" / the Remove button: that message disappears. */
  commandRemove(): void {
    if (this.phase !== "message" && this.phase !== "draft") return
    const m = this.inbox.current()
    if (!m) return
    if (!this.inbox.removeCurrent()) return
    console.log("[MessyHandsMain] removed " + m.sender + ", " + this.inbox.count + " left")
    this.returnToCompact()
  }

  /**
   * Puts the inbox back to three unread messages, waiting to be started.
   * Used to replay the demo without restarting the Lens, and by each LEAF
   * scenario so it does not inherit the previous scenario's state.
   */
  resetDemo(): void {
    if (!this.card) return
    this.inbox.load(SAMPLE_MESSAGES)
    this.phase = "idle"
    this.card.setReady(false)
    this.card.setHeader(this.inbox.headerLine())
    this.card.showIdle(this.inbox.snippet())
    console.log("[MessyHandsMain] reset to idle with " + this.inbox.count + " messages")
  }

  /** Current phase - read by the voice controller and by tests. */
  getPhase(): MessyHandsPhase {
    return this.phase
  }

  /** Sender names in list order - read by the voice controller and by tests. */
  getSenders(): string[] {
    return this.inbox.senders()
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
