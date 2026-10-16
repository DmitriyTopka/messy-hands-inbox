/**
 * Done criterion 4 - "Pinching 'Speak' (or saying the gist) shows a cleaned-up
 * reply draft on the card. Pinching 'Send' (or saying 'send') shows that the
 * reply was sent."
 *
 * Also checks the draft is actually the rewritten reply and not a copy of the
 * spoken gist, since the whole point of the product is the rewrite.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {getMain, MessyHandsLeafInteractor, paneText, resetLens} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsReplyScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const sample = SAMPLE_MESSAGES[0]

    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + sample.sender)
    await sleep(300)
    expect(main.getPhase()).toBe("message")

    // Speak the gist.
    await interactor.tap("Btn-Speak")
    await sleep(400)

    expect(main.getPhase()).toBe("draft")
    const drafted = paneText()
    // What the user said, and the cleaned-up version of it, are both shown.
    expect(drafted.includes(sample.gist)).toBe(true)
    expect(drafted.includes(sample.reply)).toBe(true)
    // The draft is a rewrite, not an echo.
    expect(sample.reply === sample.gist).toBe(false)

    // Send it.
    expect(interactor.hasControl("Btn-Send")).toBe(true)
    await interactor.tap("Btn-Send")
    await sleep(400)

    expect(main.getPhase()).toBe("sent")
    const sent = paneText()
    expect(sent.includes("Sent")).toBe(true)
    expect(sent.includes(sample.reply)).toBe(true)

    // Nothing was actually sent anywhere: the message is still in the inbox.
    expect(main.getSenders().length).toBe(3)
  }
}
