/**
 * Done criterion 5 - "Pinching 'Remove' (or saying 'remove') makes that message
 * disappear, and the card then reads '2 messages'."
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  getMain,
  headerText,
  MessyHandsLeafInteractor,
  paneText,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsRemoveScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    expect(headerText()).toBe("3 messages")

    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")

    const before = main.getSenders()
    const removed = before[0]
    await interactor.tap("Sender-" + removed)
    await sleep(300)
    expect(main.getPhase()).toBe("message")

    // Remove it.
    expect(interactor.hasControl("Btn-Remove")).toBe(true)
    await interactor.tap("Btn-Remove")
    await sleep(500)

    // The card reads one fewer message.
    expect(headerText()).toBe("2 messages")

    // That message is gone, the others are not.
    const after = main.getSenders()
    expect(after.length).toBe(before.length - 1)
    expect(after.indexOf(removed)).toBe(-1)
    expect(after.indexOf(before[1])).not.toBe(-1)

    // The card is back to its summary, now naming the next sender.
    expect(main.getPhase()).toBe("ready")
    expect(paneText().includes(before[1])).toBe(true)
  }
}
