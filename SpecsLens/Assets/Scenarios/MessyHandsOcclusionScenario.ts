/**
 * Proves: the card cannot cover the dough from ANY head angle, there is a head
 * angle that holds the whole dough, there is one that holds the whole card, and
 * from the work-centred angle the card's near edge is still on screen.
 *
 * WHY ANGLES AND NOT A SCREENSHOT
 *
 * Whether one object covers another depends only on the direction each lies in
 * from the EYE. Turning your head moves both across the display together; it
 * never slides one in front of the other. So the strong claim is about
 * directions: if the card's angular footprint and the dough's never overlap,
 * the card never covers the work, at any head angle, full stop. That is checked
 * once, not per pose.
 *
 * Head angle does decide what is IN VIEW, and that is where this scenario found
 * something. Measured against the preview camera's own field of view rather
 * than a guessed number:
 *
 *   dough      azimuth -12.4 .. +12.4 deg   (24.8 deg wide)
 *   card       azimuth +14.2 .. +42.2 deg   (28.0 deg wide)
 *   display    32.3 x 36.6 deg
 *
 * The two together span 54.6 degrees of azimuth against a 32.3 degree display,
 * so the whole dough and the whole card CANNOT be inside the glasses at the
 * same time. The user glances between them. That contradicts an earlier claim
 * in devpost/build-notes.md ("26 cm keeps the whole card and the dough visible
 * together") and it is not fixable by nudging: a 22 cm card beside a 20 cm
 * dough cannot both fit in a 32 degree window at 85 cm at any separation that
 * still leaves a gap between them. See "Round 2" in the build notes.
 *
 * The union span is asserted below as a recorded measurement, not as a goal. If
 * that assertion ever FAILS, the placement got better: update the build notes
 * and delete it.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  angularBox,
  bearingFromEye,
  cardCorners,
  DOUGH_NAME,
  eyeCamera,
  eyePosition,
  halfFovDeg,
  livePreviewEye,
  resetLens,
  visualCorners,
} from "./MessyHandsLeafInteractor"

/** Head poses a user glancing between the dough and the card would hold. */
const HEAD_POSES: {name: string; yawDeg: number; pitchDeg: number}[] = [
  {name: "straight down at the dough", yawDeg: 0, pitchDeg: -47},
  {name: "down and slightly right", yawDeg: 8, pitchDeg: -45},
  {name: "half way to the card", yawDeg: 17, pitchDeg: -46},
  {name: "glancing at the card", yawDeg: 28, pitchDeg: -48},
  {name: "head up, eyes on the work", yawDeg: 4, pitchDeg: -40},
]

@component
export class MessyHandsOcclusionScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    await resetLens()

    // The authored eye, not the preview camera - see authoredEye().
    const eye = eyePosition()
    const camera = eyeCamera()
    const fov = halfFovDeg(camera)
    const live = livePreviewEye()
    console.log(
      "[occlusion] measuring from the authored eye (0, 0, 0); the preview camera is at (" +
        live.x.toFixed(1) +
        ", " +
        live.y.toFixed(1) +
        ", " +
        live.z.toFixed(1) +
        ")"
    )

    const doughPoints = visualCorners(DOUGH_NAME)
    const cardPoints = cardCorners()
    const dough = angularBox(doughPoints, eye)
    const card = angularBox(cardPoints, eye)

    console.log(
      "[occlusion] dough az " +
        dough.minAz.toFixed(1) +
        ".." +
        dough.maxAz.toFixed(1) +
        " el " +
        dough.minEl.toFixed(1) +
        ".." +
        dough.maxEl.toFixed(1) +
        " | card az " +
        card.minAz.toFixed(1) +
        ".." +
        card.maxAz.toFixed(1) +
        " el " +
        card.minEl.toFixed(1) +
        ".." +
        card.maxEl.toFixed(1) +
        " | half-FOV " +
        fov.horizontal.toFixed(1) +
        " x " +
        fov.vertical.toFixed(1) +
        " deg"
    )

    // ── 1. Never covers the work, from any head angle ──────────────────────
    expect(card.minAz, "the card must lie entirely right of the dough").toBeGreaterThan(
      dough.maxAz
    )
    const gapDeg = card.minAz - dough.maxAz
    expect(gapDeg, "a real gap, not a shared edge").toBeGreaterThan(1.0)

    // It does not rise over the work either.
    expect(card.maxEl, "the card's top edge stays below the dough's").toBeLessThan(dough.maxEl)

    // And it lies on the counter rather than floating between the eye and the
    // dough, so even a mis-measured silhouette could not occlude.
    expect(
      card.minDistanceCm,
      "the card's nearest point must be further than the dough's"
    ).toBeGreaterThan(dough.minDistanceCm)

    console.log(
      "[occlusion] angular gap dough-to-card " +
        gapDeg.toFixed(2) +
        " deg; nearest dough " +
        dough.minDistanceCm.toFixed(1) +
        " cm, nearest card " +
        card.minDistanceCm.toFixed(1) +
        " cm"
    )

    // ── 2. A head angle that holds the whole dough ─────────────────────────
    const doughYaw = (dough.minAz + dough.maxAz) / 2
    const doughPitch = (dough.minEl + dough.maxEl) / 2
    expect(
      this.allInView(doughPoints, eye, doughYaw, doughPitch, fov),
      "there must be a head angle holding the whole dough"
    ).toBe(true)

    // ── 3. A head angle that holds the whole card ──────────────────────────
    const cardYaw = (card.minAz + card.maxAz) / 2
    const cardPitch = (card.minEl + card.maxEl) / 2
    expect(
      this.allInView(cardPoints, eye, cardYaw, cardPitch, fov),
      "there must be a head angle holding the whole card"
    ).toBe(true)
    console.log(
      "[occlusion] the whole dough is held at yaw " +
        doughYaw.toFixed(1) +
        ", pitch " +
        doughPitch.toFixed(1) +
        "; the whole card at yaw " +
        cardYaw.toFixed(1) +
        ", pitch " +
        cardPitch.toFixed(1)
    )

    // ── 4. Looking at the work, the card is still on screen ────────────────
    // Not all of it - see the header - but its near edge, which is what tells
    // the user the card is there without turning the head.
    const edgeMarginDeg = fov.horizontal - (card.minAz - doughYaw)
    expect(
      edgeMarginDeg,
      "the card's near edge must be inside the view when looking at the dough"
    ).toBeGreaterThan(0)
    console.log(
      "[occlusion] eyes on the dough: the card's near edge is " +
        edgeMarginDeg.toFixed(2) +
        " deg inside the display edge"
    )

    // ── 5. The recorded limitation ─────────────────────────────────────────
    // Asserted so the number cannot drift unnoticed. If this FAILS, the
    // placement improved - update devpost/build-notes.md and delete this.
    const both = angularBox(doughPoints.concat(cardPoints), eye)
    const spreadH = both.maxAz - both.minAz
    console.log(
      "[occlusion] KNOWN LIMIT: dough + card span " +
        spreadH.toFixed(1) +
        " deg of azimuth against a " +
        (fov.horizontal * 2).toFixed(1) +
        " deg display, so they are not both fully in view at once"
    )
    expect(
      spreadH,
      "recorded measurement, not a goal - see the header comment"
    ).toBeGreaterThan(fov.horizontal * 2)

    // ── 6. Per-pose report, so the glance range is on the record ───────────
    for (const pose of HEAD_POSES) {
      const doughSeen = this.visibleFractionAz(dough, pose.yawDeg, fov.horizontal)
      const cardSeen = this.visibleFractionAz(card, pose.yawDeg, fov.horizontal)
      console.log(
        "[occlusion] " +
          pose.name +
          " (yaw " +
          pose.yawDeg +
          ", pitch " +
          pose.pitchDeg +
          "): dough " +
          Math.round(doughSeen * 100) +
          "% in view, card " +
          Math.round(cardSeen * 100) +
          "% in view"
      )
      // Whatever the pose, something of the scene is always on screen - the
      // user is never looking at an empty display.
      expect(
        doughSeen + cardSeen,
        pose.name + ": the display must never be empty"
      ).toBeGreaterThan(0.1)
    }
  }

  /** True when every point lies inside the half-FOV around the given head angle. */
  private allInView(
    points: vec3[],
    eye: vec3,
    yawDeg: number,
    pitchDeg: number,
    fov: {horizontal: number; vertical: number}
  ): boolean {
    for (const p of points) {
      const b = bearingFromEye(p, eye)
      if (Math.abs(b.azimuthDeg - yawDeg) > fov.horizontal) return false
      if (Math.abs(b.elevationDeg - pitchDeg) > fov.vertical) return false
    }
    return true
  }

  /**
   * How much of an object's azimuth span falls inside the display at this yaw.
   *
   * Azimuth only: the vertical spread of both objects is comfortably inside the
   * 36.6 degree vertical field, so horizontal is the axis that decides this.
   */
  private visibleFractionAz(
    box: {minAz: number; maxAz: number},
    yawDeg: number,
    halfHorizontalDeg: number
  ): number {
    const viewLo = yawDeg - halfHorizontalDeg
    const viewHi = yawDeg + halfHorizontalDeg
    const lo = Math.max(box.minAz, viewLo)
    const hi = Math.min(box.maxAz, viewHi)
    if (hi <= lo) return 0
    return (hi - lo) / (box.maxAz - box.minAz)
  }
}
