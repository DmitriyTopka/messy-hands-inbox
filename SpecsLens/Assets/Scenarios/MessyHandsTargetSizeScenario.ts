/**
 * Proves: every tappable thing on the card is at least 4 cm in both directions,
 * in every pane - the floor the brief sets for hands that are busy and dirty.
 *
 * Measured off each control's COLLIDER, not its authored size: the collider is
 * what a hand or a ray has to land on, so a button whose size was set while its
 * collider stayed small would pass a size check and still be unhittable. The
 * authored size is checked too, and the two have to agree.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  cardControls,
  cardPlate,
  controlSizeCm,
  getCard,
  getMain,
  MessyHandsLeafInteractor,
  resetLens,
} from "./MessyHandsLeafInteractor"

/** The brief: "Targets are big (at least 4 cm tall)". */
const MIN_TARGET_CM = 4.0

@component
export class MessyHandsTargetSizeScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const card = getCard()
    const main = getMain()

    // The card's own setting has to respect the floor in the first place.
    expect(card.buttonHeightCm).toBeGreaterThan(MIN_TARGET_CM - 0.001)

    // The plate the controls sit on is itself interactable - that is UIKit's
    // BackPlate catching pinches so they do not fall through the card. It is
    // not a target, but it is the biggest hit zone on the card and it must not
    // be smaller than the controls it hosts, or a near miss would land on
    // nothing at all.
    const plate = cardPlate()
    expect(plate, "the card's BackPlate must carry an interaction plane").not.toBeNull()
    const plateSize = controlSizeCm(plate as NonNullable<typeof plate>)
    expect(plateSize.x).toBeGreaterThan(card.cardWidthCm - 1)
    expect(plateSize.y).toBeGreaterThan(card.cardHeightCm - 1)
    console.log(
      "[target-size] card plate hit zone " +
        plateSize.x.toFixed(1) +
        " x " +
        plateSize.y.toFixed(1) +
        " cm (not counted as a target)"
    )

    let controlsChecked = 0
    let smallestHeight = 1e9
    let smallestWidth = 1e9

    const checkPane = (paneName: string, expectedCount: number): void => {
      const controls = cardControls()
      expect(controls.length, paneName + " control count").toBe(expectedCount)
      for (const control of controls) {
        const name = control.getSceneObject().name
        const size = controlSizeCm(control)
        expect(
          size.y,
          paneName + ' control "' + name + '" is ' + size.y.toFixed(2) + " cm tall"
        ).toBeGreaterThan(MIN_TARGET_CM - 0.001)
        expect(
          size.x,
          paneName + ' control "' + name + '" is ' + size.x.toFixed(2) + " cm wide"
        ).toBeGreaterThan(MIN_TARGET_CM - 0.001)
        smallestHeight = Math.min(smallestHeight, size.y)
        smallestWidth = Math.min(smallestWidth, size.x)
        controlsChecked++
      }
    }

    // idle: Start only.
    checkPane("idle", 1)

    // compact: "Who wrote" only.
    await interactor.tap("Btn-Start")
    await sleep(500)
    checkPane("compact", 1)

    // senders: one row per message, and they are the tallest targets on the card.
    await interactor.tap("Btn-Who wrote")
    await sleep(500)
    checkPane("senders", 3)
    for (const control of cardControls()) {
      // Sender rows get the pane's spare height, so they clear the floor with room.
      expect(controlSizeCm(control).y).toBeGreaterThan(5.0)
    }

    // message: Speak + Remove side by side - the narrowest targets on the card.
    await interactor.tap("Sender-" + SAMPLE_MESSAGES[0].sender)
    await sleep(500)
    checkPane("message", 2)

    // draft: Send + Remove.
    await interactor.tap("Btn-Speak")
    await sleep(500)
    checkPane("draft", 2)

    // sent: nothing to press, by design - the state leaves on its own.
    // Checked straight after the tap for the same reason as above: tap()
    // already waits out the rebuild, and the sent pane expires after
    // sentHoldSeconds, so a pause here would count the compact pane's button.
    await interactor.tap("Btn-Send")
    checkPane("sent", 0)
    await sleep(main.sentHoldSeconds * 1000 + 1000)

    console.log(
      "[target-size] " +
        controlsChecked +
        " controls across 5 interactive pane states; smallest " +
        smallestWidth.toFixed(2) +
        " x " +
        smallestHeight.toFixed(2) +
        " cm against a " +
        MIN_TARGET_CM +
        " cm floor"
    )
    expect(controlsChecked).toBe(9)

    await resetLens()
  }
}
