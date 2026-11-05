/**
 * Proves: nothing on the card is small or faded - every line of text, in every
 * pane, is at least 1.2 cm of glyph height and near-white at full alpha.
 *
 * WHAT THIS IS AND IS NOT
 *
 * It is a regression test on the two design decisions the card was rebuilt
 * around (see "Design fix 2" in devpost/build-notes.md): type sized for a
 * glance at a counter rather than a panel held near the face, and no contrast
 * carried by alpha, because an additive display only ever adds light and a
 * faded glyph is a straight loss against a lit kitchen.
 *
 * It is NOT a claim that the card is comfortable to read. That needs eyes
 * behind real optics. What it does do is measure, report and freeze the
 * numbers: the eye-to-card distance, the smallest glyph on the card, and the
 * visual angle that works out to. The brief's "55 cm" is where the DOUGH is;
 * the card sits further out and down-right, so the measured distance is
 * reported rather than assumed, and the angle - not the centimetre - is what
 * gets asserted.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  bearingFromEye,
  cardTexts,
  CARD_NAME,
  DOUGH_NAME,
  emHeightCm,
  eyePosition,
  getMain,
  livePreviewEye,
  MessyHandsLeafInteractor,
  resetLens,
  visualCorners,
} from "./MessyHandsLeafInteractor"
import {findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"

/** The design's own floor: Body is 39 * 1.45 = 56.55 units, i.e. 1.288 cm. */
const MIN_EM_CM = 1.2

/** Below this the type stops being a glance and becomes a squint. */
const MIN_VISUAL_ANGLE_DEG = 0.8

/** Near-white: the dimmest channel of any text colour on the card. */
const MIN_CHANNEL = 0.7

@component
export class MessyHandsReadabilityScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    // The authored eye, not the preview camera - see authoredEye(). A capture
    // pass that leaves the camera somewhere else must not change what this
    // scenario reports about the design.
    const eye = eyePosition()
    const live = livePreviewEye()
    console.log(
      "[readability] measuring from the authored eye (0, 0, 0); the preview camera is at (" +
        live.x.toFixed(1) +
        ", " +
        live.y.toFixed(1) +
        ", " +
        live.z.toFixed(1) +
        ")"
    )

    // ── Where the card actually is, measured not assumed ───────────────────
    const cardObject = findSceneObjectByName(CARD_NAME)
    if (!cardObject) throw new Error('Scene object "' + CARD_NAME + '" not found')
    const cardBearing = bearingFromEye(cardObject.getTransform().getWorldPosition(), eye)

    const doughCorners = visualCorners(DOUGH_NAME)
    let doughNear = 1e9
    for (const c of doughCorners) {
      doughNear = Math.min(doughNear, bearingFromEye(c, eye).distanceCm)
    }

    console.log(
      "[readability] eye-to-card " +
        cardBearing.distanceCm.toFixed(1) +
        " cm, nearest dough surface " +
        doughNear.toFixed(1) +
        " cm, card bearing " +
        cardBearing.azimuthDeg.toFixed(1) +
        " deg right / " +
        cardBearing.elevationDeg.toFixed(1) +
        " deg down"
    )

    // The card is where the brief puts it: down and to the right of the work.
    expect(cardBearing.azimuthDeg).toBeGreaterThan(0)
    expect(cardBearing.elevationDeg).toBeLessThan(0)
    // And within a glance, not across the room.
    expect(cardBearing.distanceCm).toBeLessThan(120)

    // The card's own scale must be 1, or every centimetre below is wrong.
    const cardScale = cardObject.getTransform().getWorldScale()
    expect(cardScale.x).toBeCloseTo(1, 2)
    expect(cardScale.y).toBeCloseTo(1, 2)

    // ── Every pane, every line ─────────────────────────────────────────────
    const main = getMain()
    let smallestEm = 1e9
    let dimmestChannel = 1
    let linesChecked = 0

    const checkCurrentPane = (paneName: string): void => {
      const texts = cardTexts()
      expect(texts.length).toBeGreaterThan(0)
      for (const t of texts) {
        const em = emHeightCm(t)
        const fill = t.textFill.color
        const dimmest = Math.min(fill.r, fill.g, fill.b)

        expect(em, paneName + ': "' + t.text + '" glyph height ' + em.toFixed(2) + " cm")
          .toBeGreaterThan(MIN_EM_CM)
        // Full alpha: on an additive display, alpha below 1 is lost contrast
        // for nothing.
        expect(fill.a, paneName + ': "' + t.text + '" alpha').toBeCloseTo(1, 2)
        expect(dimmest, paneName + ': "' + t.text + '" dimmest channel').toBeGreaterThan(
          MIN_CHANNEL
        )

        smallestEm = Math.min(smallestEm, em)
        dimmestChannel = Math.min(dimmestChannel, dimmest)
        linesChecked++
      }
    }

    checkCurrentPane("idle")

    await interactor.tap("Btn-Start")
    await sleep(500)
    checkCurrentPane("compact")

    await interactor.tap("Btn-Who wrote")
    await sleep(500)
    checkCurrentPane("senders")

    await interactor.tap("Sender-" + SAMPLE_MESSAGES[0].sender)
    await sleep(500)
    checkCurrentPane("message")

    await interactor.tap("Btn-Speak")
    await sleep(500)
    checkCurrentPane("draft")

    // Read straight after the tap, with no sleep of its own: tap() already
    // settles past the card's rebuild, and the sent pane only exists for
    // sentHoldSeconds. An extra pause here would read whatever replaced it.
    await interactor.tap("Btn-Send")
    checkCurrentPane("sent")
    await sleep(main.sentHoldSeconds * 1000 + 1000)

    // The remembered-session hint is a line the user reads too.
    main.resetDemo()
    await sleep(500)
    main.getMemory().save({sent: [SAMPLE_MESSAGES[0].id], removed: [SAMPLE_MESSAGES[1].id]})
    main.reloadFromMemory()
    await sleep(700)
    checkCurrentPane("idle-with-memory-hint")

    // ── The numbers this build actually hits ───────────────────────────────
    const smallestAngleDeg =
      (2 * Math.atan(smallestEm / 2 / cardBearing.distanceCm) * 180) / Math.PI
    console.log(
      "[readability] " +
        linesChecked +
        " lines checked across 7 pane states; smallest glyph " +
        smallestEm.toFixed(2) +
        " cm = " +
        smallestAngleDeg.toFixed(2) +
        " deg at " +
        cardBearing.distanceCm.toFixed(1) +
        " cm; dimmest channel " +
        dimmestChannel.toFixed(2)
    )

    expect(linesChecked).toBeGreaterThan(10)
    expect(smallestAngleDeg).toBeGreaterThan(MIN_VISUAL_ANGLE_DEG)

    await resetLens()
  }
}
