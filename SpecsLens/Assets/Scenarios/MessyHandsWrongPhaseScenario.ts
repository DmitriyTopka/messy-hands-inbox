/**
 * Proves: every command is ignored outside the phase it belongs to, so a
 * misheard word or a stale button reference cannot corrupt the flow.
 *
 * This is the guard that lets voice be wired at all. Speech recognition hands
 * back whatever it thought it heard, whenever it hears it; the phase table in
 * MessyHandsMain is the only thing standing between that and a card showing a
 * draft for a message nobody opened.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {getMain, headerText, MessyHandsLeafInteractor, resetLens} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsWrongPhaseScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()

    // ── idle: nothing but Start is allowed ──────────────────────────────────
    expect(main.getPhase()).toBe("idle")
    main.commandWhoWrote()
    main.commandOpenIndex(0)
    main.commandSpeak()
    main.commandSend()
    main.commandRemove()
    expect(main.commandOpenSender("Mom")).toBe(false)
    await sleep(400)
    expect(main.getPhase()).toBe("idle")
    expect(headerText()).toBe("3 messages")
    expect(main.getSenders().length).toBe(3)
    expect(main.getRemembered().sent.length).toBe(0)
    expect(main.getRemembered().removed.length).toBe(0)

    // ── ready: speaking, sending and removing all need an open message ──────
    main.commandStart()
    await sleep(400)
    expect(main.getPhase()).toBe("ready")
    main.commandSpeak()
    main.commandSend()
    main.commandRemove()
    main.commandOpenIndex(0)
    await sleep(400)
    expect(main.getPhase()).toBe("ready")
    expect(main.getSenders().length).toBe(3)

    // ── senders: still nothing to reply to until a row is opened ────────────
    main.commandWhoWrote()
    await sleep(400)
    expect(main.getPhase()).toBe("senders")
    main.commandSpeak()
    main.commandSend()
    main.commandRemove()
    await sleep(400)
    expect(main.getPhase()).toBe("senders")

    // ── message: Send without a draft is ignored; Speak is the way in ───────
    main.commandOpenIndex(0)
    await sleep(400)
    expect(main.getPhase()).toBe("message")
    main.commandSend()
    await sleep(400)
    expect(main.getPhase()).toBe("message")

    // ── draft: a second Speak does not re-draft, Who wrote is still fine ────
    main.commandSpeak()
    await sleep(400)
    expect(main.getPhase()).toBe("draft")
    main.commandSpeak()
    await sleep(400)
    expect(main.getPhase()).toBe("draft")

    // ── sent: the hold is not interruptible by another command ─────────────
    main.commandSend()
    await sleep(400)
    expect(main.getPhase()).toBe("sent")
    main.commandWhoWrote()
    main.commandSpeak()
    main.commandSend()
    main.commandRemove()
    await sleep(400)
    expect(main.getPhase()).toBe("sent")

    // Out-of-range rows never open anything, whatever the phase.
    expect(main.commandOpenSender("Nobody")).toBe(false)

    await resetLens()
    expect(main.getPhase()).toBe("idle")
    expect(interactor.hasControl("Btn-Start")).toBe(true)
  }
}
