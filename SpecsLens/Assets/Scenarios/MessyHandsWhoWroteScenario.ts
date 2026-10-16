/**
 * Done criterion 3 - "Pinching 'Who wrote' (or saying it) shows three sender
 * names on the card. Pinching a name opens that person's message."
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {getMain, MessyHandsLeafInteractor, paneText, resetLens} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsWhoWroteScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const senders = main.getSenders()
    expect(senders.length).toBe(3)

    await interactor.tap("Btn-Start")
    await sleep(300)

    // Ask who wrote.
    await interactor.tap("Btn-Who wrote")
    await sleep(400)

    expect(main.getPhase()).toBe("senders")

    // All three names are on the card, each as its own big target.
    const listed = paneText()
    for (const sender of senders) {
      expect(listed.includes(sender)).toBe(true)
      expect(interactor.hasControl("Sender-" + sender)).toBe(true)
    }

    // Pinching a name opens that person's message.
    const first = senders[0]
    await interactor.tap("Sender-" + first)
    await sleep(400)

    expect(main.getPhase()).toBe("message")
    const opened = paneText()
    expect(opened.includes(first)).toBe(true)
    // The sender list is gone, replaced by the message itself.
    expect(interactor.hasControl("Sender-" + senders[1])).toBe(false)
    expect(interactor.hasControl("Btn-Speak")).toBe(true)
  }
}
