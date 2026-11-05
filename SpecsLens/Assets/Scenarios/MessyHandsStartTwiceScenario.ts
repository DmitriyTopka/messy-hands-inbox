/**
 * Proves: Start cannot be pressed twice into a broken state - the button is
 * gone after the first press, and the command behind it is a no-op once ready.
 *
 * Both halves matter. The missing button is what a user sees; the ignored
 * command is what a misheard "start" from the voice route would hit.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  dotColor,
  getCard,
  getMain,
  headerText,
  MessyHandsLeafInteractor,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsStartTwiceScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const card = getCard()
    expect(main.getPhase()).toBe("idle")
    expect(interactor.hasControl("Btn-Start")).toBe(true)

    await interactor.tap("Btn-Start")
    await sleep(400)
    expect(main.getPhase()).toBe("ready")

    const greenOnce = dotColor()
    expect(greenOnce.g).toBeCloseTo(card.readyDotColor.g, 2)

    // The card has swapped Start for "Who wrote", so there is nothing to press
    // a second time.
    expect(interactor.hasControl("Btn-Start")).toBe(false)
    expect(interactor.hasControl("Btn-Who wrote")).toBe(true)

    // The command route is still reachable - voice, or a stale reference - and
    // it must change nothing.
    main.commandStart()
    main.commandStart()
    await sleep(400)

    expect(main.getPhase()).toBe("ready")
    expect(headerText()).toBe("3 messages")
    expect(main.getSenders().length).toBe(3)
    const greenTwice = dotColor()
    expect(greenTwice.r).toBeCloseTo(greenOnce.r, 2)
    expect(greenTwice.g).toBeCloseTo(greenOnce.g, 2)
    expect(greenTwice.b).toBeCloseTo(greenOnce.b, 2)

    // And the flow still works from there, which is the real point: a repeated
    // Start must not leave the card unable to continue.
    await interactor.tap("Btn-Who wrote")
    await sleep(400)
    expect(main.getPhase()).toBe("senders")
  }
}
