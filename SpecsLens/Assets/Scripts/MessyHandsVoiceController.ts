/**
 * MessyHandsVoiceController - the optional hands-free route.
 *
 * Owns: the ASR session and the mapping from a spoken phrase to one of
 * MessyHandsMain's commands. Nothing else. Every command it can issue is also
 * on a button, so this layer is pure addition: if speech is unavailable,
 * misheard, or offline, the card still works exactly as before.
 *
 * Deliberately defensive. Snap's own ASR guidance is that keyword spotting is
 * unreliable - partial transcripts churn and short command words get
 * misrecognised - so this controller treats every failure as "turn voice off
 * and stay quiet", never as an error the user has to deal with.
 *
 * @inputs: the main script, plus an on/off switch for voice.
 */

import {MessyHandsMain} from "./MessyHandsMain"

/** Spoken phrases that map to each command, lowercased. */
const PHRASE_START = ["start", "start lens", "begin"]
const PHRASE_WHO_WROTE = ["who wrote", "who", "whos writing", "who's writing"]
const PHRASE_SPEAK = ["speak", "reply", "answer"]
const PHRASE_SEND = ["send", "send it"]
const PHRASE_REMOVE = ["remove", "delete", "dismiss"]

@component
export class MessyHandsVoiceController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">MessyHandsVoiceController - optional hands-free commands</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The main script whose commands spoken words map to. Wired by the bootstrap.")
  main!: MessyHandsMain
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Listen for spoken commands. Off means buttons only. Voice never replaces a button. Needs Lens Studio sign-in: without it the preview's VoiceML token fetch returns 401 on a loop.")
  enableVoice: boolean = false
  @ui.group_end

  private asrModule: any = null
  private listening: boolean = false

  onAwake(): void {
    // Session setup must not happen in onAwake, and main is a sibling script.
    this.createEvent("OnStartEvent").bind(() => this.startListening())
    this.createEvent("OnDestroyEvent").bind(() => this.stopListening())
  }

  private startListening(): void {
    if (!this.enableVoice) {
      console.log("[MessyHandsVoice] voice off, buttons only")
      return
    }
    if (!this.main) {
      console.log("[MessyHandsVoice] main not wired, voice disabled")
      return
    }

    try {
      this.asrModule = require("LensStudio:AsrModule")
      const options = AsrModule.AsrTranscriptionOptions.create()
      options.silenceUntilTerminationMs = 900
      options.mode = AsrModule.AsrMode.Balanced

      options.onTranscriptionUpdateEvent.add((e: AsrModule.TranscriptionUpdateEvent) => {
        if (e.isFinal) this.handlePhrase(e.text)
      })

      options.onTranscriptionErrorEvent.add((code: AsrModule.AsrStatusCode) => {
        // Not fatal and not worth bothering the user: the buttons do everything
        // voice does, so a failed session just means this layer goes quiet.
        console.log("[MessyHandsVoice] speech unavailable (code " + code + "), buttons still work")
        this.listening = false
      })

      this.asrModule.startTranscribing(options)
      this.listening = true
      console.log("[MessyHandsVoice] listening for commands")
    } catch (e) {
      this.asrModule = null
      this.listening = false
      console.log("[MessyHandsVoice] no speech module here, buttons still work: " + e)
    }
  }

  private stopListening(): void {
    if (!this.asrModule || !this.listening) return
    try {
      this.asrModule.stopTranscribing()
    } catch (e) {
      // Shutting down; nothing to recover.
    }
    this.listening = false
  }

  /** Routes one finished phrase to the same command a button would call. */
  private handlePhrase(raw: string): void {
    if (!this.main) return
    const phrase = raw.toLowerCase().replace(/[.,!?]/g, "").trim()
    if (phrase.length === 0) return

    if (this.matches(phrase, PHRASE_START)) {
      this.main.commandStart()
      return
    }
    if (this.matches(phrase, PHRASE_WHO_WROTE)) {
      this.main.commandWhoWrote()
      return
    }
    if (this.matches(phrase, PHRASE_SPEAK)) {
      this.main.commandSpeak()
      return
    }
    if (this.matches(phrase, PHRASE_SEND)) {
      this.main.commandSend()
      return
    }
    if (this.matches(phrase, PHRASE_REMOVE)) {
      this.main.commandRemove()
      return
    }

    // Otherwise: a sender's name opens that person's message.
    for (const sender of this.main.getSenders()) {
      if (phrase.indexOf(sender.toLowerCase()) !== -1) {
        this.main.commandOpenSender(sender)
        return
      }
    }
  }

  private matches(phrase: string, options: string[]): boolean {
    for (const option of options) {
      if (phrase === option || phrase.indexOf(option) !== -1) return true
    }
    return false
  }
}
