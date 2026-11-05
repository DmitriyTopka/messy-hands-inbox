/**
 * Proves: Remove works with a reply draft already on screen - the message goes,
 * the draft goes with it, and the card lands back on the summary.
 *
 * The draft pane carries Remove next to Send on purpose: changing your mind
 * after seeing the rewrite is the normal case, not an edge case.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  getMain,
  headerText,
  MessyHandsLeafInteractor,
  paneText,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsRemoveFromDraftScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const sample = SAMPLE_MESSAGES[0]

    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + sample.sender)
    await interactor.tap("Btn-Speak")
    await sleep(400)

    expect(main.getPhase()).toBe("draft")
    expect(paneText().includes(sample.reply)).toBe(true)
    expect(interactor.hasControl("Btn-Remove")).toBe(true)
    expect(interactor.hasControl("Btn-Send")).toBe(true)

    await interactor.tap("Btn-Remove")
    await sleep(600)

    // Gone, not sent.
    expect(main.getPhase()).toBe("ready")
    expect(headerText()).toBe("2 messages")
    expect(main.getSenders().indexOf(sample.sender)).toBe(-1)
    expect(main.getRemembered().removed.indexOf(sample.id)).not.toBe(-1)
    expect(main.getRemembered().sent.indexOf(sample.id)).toBe(-1)

    // The draft is off the card, and so are the draft's buttons.
    const after = paneText()
    expect(after.includes(sample.reply)).toBe(false)
    expect(interactor.hasControl("Btn-Send")).toBe(false)
    expect(interactor.hasControl("Btn-Who wrote")).toBe(true)

    await resetLens()
  }
}
