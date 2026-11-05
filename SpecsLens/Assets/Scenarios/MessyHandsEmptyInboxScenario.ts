/**
 * Proves: removing all three messages leaves an empty inbox that says so, and
 * the card does not break or offer rows that are no longer there.
 *
 * This is the state the demo never reaches by accident, and the one most likely
 * to divide by zero: the sender pane shares the pane height out between n rows.
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
export class MessyHandsEmptyInboxScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    expect(headerText()).toBe("3 messages")

    await interactor.tap("Btn-Start")

    // Always open the top row: the list re-numbers itself after each removal.
    const expectedHeaders = ["2 messages", "1 message", "No messages"]
    for (let round = 0; round < 3; round++) {
      console.log("[empty-inbox] round " + (round + 1) + "/3: asking who wrote")
      await interactor.tap("Btn-Who wrote")
      await sleep(400)
      const senders = main.getSenders()
      expect(senders.length).toBe(3 - round)

      console.log("[empty-inbox] round " + (round + 1) + "/3: opening " + senders[0])
      await interactor.tap("Sender-" + senders[0])
      await sleep(400)
      expect(main.getPhase()).toBe("message")

      console.log("[empty-inbox] round " + (round + 1) + "/3: removing " + senders[0])
      await interactor.tap("Btn-Remove")
      await sleep(700)
      expect(headerText()).toBe(expectedHeaders[round])
      console.log("[empty-inbox] round " + (round + 1) + "/3: card now reads " + headerText())
    }

    // Empty, and honest about it.
    expect(main.getSenders().length).toBe(0)
    expect(headerText()).toBe("No messages")
    expect(paneText().includes("Nothing waiting for you.")).toBe(true)
    expect(main.getPhase()).toBe("ready")

    // "Who wrote" on an empty inbox returns to the summary instead of building
    // a zero-row list.
    await interactor.tap("Btn-Who wrote")
    await sleep(500)
    expect(main.getPhase()).toBe("ready")
    expect(interactor.hasControl("Sender-Mom")).toBe(false)
    expect(headerText()).toBe("No messages")

    // All three are remembered as thrown away, so a restart stays empty.
    expect(main.getRemembered().removed.length).toBe(3)

    await resetLens()
  }
}
