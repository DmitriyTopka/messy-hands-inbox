/**
 * Done criterion 1 - "At start, a neutral gray dot shows on the card. Saying
 * 'start' or pinching Start turns the dot green."
 *
 * Checks the dot is the neutral colour while idle, then pinches Start and
 * checks it has turned green. Colours are read from the card's own @input
 * values, so retuning them in the Inspector does not break the test.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {MessyHandsCardUI} from "../Scripts/MessyHandsCardUI"
import {CARD_NAME, dotColor, MessyHandsLeafInteractor, resetLens} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsStatusDotScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const cardObject = findSceneObjectByName(CARD_NAME)
    if (!cardObject) throw new Error('Scene object "' + CARD_NAME + '" not found')
    const card = cardObject.getComponent(MessyHandsCardUI.getTypeName()) as MessyHandsCardUI

    // Idle: the dot sits at the neutral grey the card was configured with.
    const idle = dotColor()
    expect(idle.r).toBeCloseTo(card.idleDotColor.r, 2)
    expect(idle.g).toBeCloseTo(card.idleDotColor.g, 2)
    expect(idle.b).toBeCloseTo(card.idleDotColor.b, 2)

    // Pinch Start.
    await interactor.tap("Btn-Start")
    await sleep(400)

    // Ready: the dot is green.
    const ready = dotColor()
    expect(ready.r).toBeCloseTo(card.readyDotColor.r, 2)
    expect(ready.g).toBeCloseTo(card.readyDotColor.g, 2)
    expect(ready.b).toBeCloseTo(card.readyDotColor.b, 2)

    // Green is distinguishable from grey: more green than red.
    expect(ready.g > ready.r).toBe(true)
    expect(ready.g > idle.g).toBe(true)
  }
}
