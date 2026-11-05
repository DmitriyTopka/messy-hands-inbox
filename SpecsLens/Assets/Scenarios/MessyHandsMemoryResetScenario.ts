/**
 * Proves: reset clears the persisted state too, so the next Lens start is a
 * fresh three-message inbox and not yesterday's leftovers.
 *
 * Without this, "reset the demo" would be a lie the moment memory shipped:
 * the card would come back to two messages on the next start, and the whole
 * LEAF suite - which resets before every scenario - would inherit state.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  cardRowText,
  getMain,
  headerText,
  HINT_NAME,
  MessyHandsLeafInteractor,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsMemoryResetScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const replied = SAMPLE_MESSAGES[0]
    const cleared = SAMPLE_MESSAGES[1]

    // Put something real in the store first.
    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + replied.sender)
    await interactor.tap("Btn-Speak")
    await interactor.tap("Btn-Send")
    await sleep(main.sentHoldSeconds * 1000 + 1000)
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + cleared.sender)
    await interactor.tap("Btn-Remove")
    await sleep(600)

    expect(main.getMemory().hasAnything()).toBe(true)
    expect(main.getStoredState().sent.length).toBe(1)
    expect(main.getStoredState().removed.length).toBe(1)
    expect(headerText()).toBe("2 messages")
    expect(cardRowText(HINT_NAME)).toBeNull() // hint shows on idle, and we are ready

    // ── Reset ───────────────────────────────────────────────────────────────
    await resetLens()

    // Both keys gone, not just emptied in this run's copy.
    expect(main.getMemory().hasAnything()).toBe(false)
    expect(main.getStoredState().sent.length).toBe(0)
    expect(main.getStoredState().removed.length).toBe(0)
    expect(main.getRemembered().sent.length).toBe(0)
    expect(main.getRemembered().removed.length).toBe(0)

    // And a start from that store is a clean three, with no hint row.
    const restored = main.reloadFromMemory()
    await sleep(600)
    expect(restored.sent.length).toBe(0)
    expect(restored.removed.length).toBe(0)
    expect(headerText()).toBe("3 messages")
    expect(main.getSenders().length).toBe(3)
    expect(main.getMemoryHint()).toBe("")
    expect(cardRowText(HINT_NAME)).toBeNull()
    expect(interactor.hasControl("Btn-Start")).toBe(true)
  }
}
