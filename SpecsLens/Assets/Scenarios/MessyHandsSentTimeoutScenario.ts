/**
 * Proves: the "Sent" state expires on its own back to the summary, with no
 * input at all, within the hold the Inspector is set to.
 *
 * Hands in dough is the whole premise, so any state that needs a press to leave
 * is a dead end. The wait is read from MessyHandsMain's own @input rather than
 * hard-coded, so retuning the hold does not silently break this.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  getCard,
  getMain,
  headerText,
  MessyHandsLeafInteractor,
  paneText,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsSentTimeoutScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const card = getCard()
    const sample = SAMPLE_MESSAGES[0]
    const holdSeconds = main.sentHoldSeconds

    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + sample.sender)
    await interactor.tap("Btn-Speak")
    await interactor.tap("Btn-Send")
    await sleep(400)

    expect(main.getPhase()).toBe("sent")
    expect(paneText().includes(card.sentLabel)).toBe(true)

    // Still held a fraction of the way in: the state is a real dwell, not a flash.
    await sleep(holdSeconds * 1000 * 0.3)
    expect(main.getPhase()).toBe("sent")

    // Past the hold plus the card's own rebuild delay, with nothing pressed.
    await sleep(holdSeconds * 1000 + 1200)

    expect(main.getPhase()).toBe("ready")
    const after = paneText()
    expect(after.includes(card.sentLabel)).toBe(false)
    expect(after.includes(sample.sender)).toBe(true)
    expect(headerText()).toBe("3 messages")
    expect(interactor.hasControl("Btn-Who wrote")).toBe(true)

    // Nothing left the Lens, and the reply is remembered as sent.
    expect(main.getSenders().length).toBe(3)
    expect(main.getRemembered().sent.indexOf(sample.id)).not.toBe(-1)

    await resetLens()
  }
}
