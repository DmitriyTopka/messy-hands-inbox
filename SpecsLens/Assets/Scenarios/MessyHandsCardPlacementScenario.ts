/**
 * Done criterion 2 - "One card lies to the right of and below the dough on the
 * counter and reads '3 messages', without covering the dough."
 *
 * Reads the real runtime bounds of the dough and the authored card transform,
 * so this is a placement check, not a restatement of the numbers in the
 * bootstrap. "Without covering" is tested as a true gap between the dough's
 * right edge and the card's left edge.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {MessyHandsCardUI} from "../Scripts/MessyHandsCardUI"
import {CARD_NAME, headerText, resetLens} from "./MessyHandsLeafInteractor"

const DOUGH_NAME = "DoughBall"
const COUNTER_TOP_NAME = "CounterTop"

@component
export class MessyHandsCardPlacementScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    await resetLens()

    // The card reads the count, with three messages waiting.
    expect(headerText()).toBe("3 messages")

    const cardObject = findSceneObjectByName(CARD_NAME)
    if (!cardObject) throw new Error('Scene object "' + CARD_NAME + '" not found')
    const doughObject = findSceneObjectByName(DOUGH_NAME)
    if (!doughObject) throw new Error('Scene object "' + DOUGH_NAME + '" not found')
    const counterObject = findSceneObjectByName(COUNTER_TOP_NAME)
    if (!counterObject) throw new Error('Scene object "' + COUNTER_TOP_NAME + '" not found')

    const card = cardObject.getComponent(MessyHandsCardUI.getTypeName()) as MessyHandsCardUI
    const cardPos = cardObject.getTransform().getWorldPosition()

    const doughVisual = doughObject.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    const doughMin = doughVisual.worldAabbMin()
    const doughMax = doughVisual.worldAabbMax()
    const doughCenterY = (doughMin.y + doughMax.y) * 0.5

    const counterVisual = counterObject.getComponent(
      "Component.RenderMeshVisual"
    ) as RenderMeshVisual
    const counterTopY = counterVisual.worldAabbMax().y

    // The card is pitched up toward the user, so its edges are taken through
    // its own transform rather than assumed to be axis-aligned.
    const toWorld = cardObject.getTransform().getWorldTransform()
    const halfW = card.cardWidthCm * 0.5
    const halfH = card.cardHeightCm * 0.5
    const cardBottom = toWorld.multiplyPoint(new vec3(0, -halfH, 0))
    const cardTop = toWorld.multiplyPoint(new vec3(0, halfH, 0))
    const cardLeft = toWorld.multiplyPoint(new vec3(-halfW, 0, 0))

    // To the right of the dough.
    expect(cardPos.x > doughMax.x).toBe(true)

    // Below the dough's centre.
    expect(cardPos.y < doughCenterY).toBe(true)

    // Resting on the counter: the lower edge sits just above the surface.
    expect(cardBottom.y > counterTopY).toBe(true)
    expect(cardBottom.y - counterTopY < 6).toBe(true)

    // It does not rise above the dough and block the view of the work.
    expect(cardTop.y < doughMax.y).toBe(true)

    // A real gap: the card's left edge clears the dough's right edge.
    expect(cardLeft.x > doughMax.x).toBe(true)
    expect(cardLeft.x - doughMax.x > 2).toBe(true)
  }
}
