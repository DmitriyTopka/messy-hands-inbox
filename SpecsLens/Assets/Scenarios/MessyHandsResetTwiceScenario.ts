/**
 * Proves: reset is idempotent - twice in a row, and after real damage, it still
 * gives exactly the three-message idle card the demo starts from.
 *
 * Every other scenario in this suite calls resetDemo() first, so the whole
 * suite's determinism rests on this one behaving.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {MessyHandsCardUI} from "../Scripts/MessyHandsCardUI"
import {
  cardRowText,
  dotColor,
  getCard,
  getMain,
  headerText,
  HINT_NAME,
  MessyHandsLeafInteractor,
  paneText,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsResetTwiceScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    const main = getMain()
    const card = getCard()

    // Two resets back to back, from an unknown starting state.
    await resetLens()
    await resetLens()
    this.expectCleanIdle(card, interactor)

    // Now do damage: reply to one and throw another away.
    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")
    const senders = main.getSenders()
    await interactor.tap("Sender-" + senders[0])
    await interactor.tap("Btn-Speak")
    await interactor.tap("Btn-Send")
    await sleep(main.sentHoldSeconds * 1000 + 1000)
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + senders[1])
    await interactor.tap("Btn-Remove")
    await sleep(600)

    expect(headerText()).toBe("2 messages")
    expect(main.getRemembered().sent.length).toBe(1)
    expect(main.getRemembered().removed.length).toBe(1)

    // And reset twice again.
    await resetLens()
    await resetLens()
    this.expectCleanIdle(card, interactor)
    expect(main.getSenders().length).toBe(3)
    expect(main.getSenders()[0]).toBe(senders[0])
  }

  /** The exact card a first-ever run shows. */
  private expectCleanIdle(card: MessyHandsCardUI, interactor: MessyHandsLeafInteractor): void {
    const main = getMain()
    expect(main.getPhase()).toBe("idle")
    expect(headerText()).toBe("3 messages")
    expect(main.getSenders().length).toBe(3)

    // Nothing remembered, in this run or on disk, and no hint row on the card.
    expect(main.getRemembered().sent.length).toBe(0)
    expect(main.getRemembered().removed.length).toBe(0)
    expect(main.getStoredState().sent.length).toBe(0)
    expect(main.getStoredState().removed.length).toBe(0)
    expect(cardRowText(HINT_NAME)).toBeNull()

    // Grey dot, Start offered, Mom named in the snippet.
    const dot = dotColor()
    expect(dot.r).toBeCloseTo(card.idleDotColor.r, 2)
    expect(dot.g).toBeCloseTo(card.idleDotColor.g, 2)
    expect(dot.b).toBeCloseTo(card.idleDotColor.b, 2)
    expect(interactor.hasControl("Btn-Start")).toBe(true)
    expect(interactor.hasControl("Btn-Who wrote")).toBe(false)
    expect(paneText().includes("Mom")).toBe(true)
  }
}
