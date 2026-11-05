/**
 * MessyHandsLeafInteractor - shared helpers for the Messy Hands LEAF suite.
 *
 * Owns: tapping a card button by name, reading back what the card currently
 * says, and the reset that puts the Lens in a known state before each run.
 *
 * Scenarios run sequentially against one live Lens, so every scenario starts
 * with resetDemo() instead of assuming the state the previous one left.
 */

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractables, findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {
  findSceneObjectByName,
  forEachSceneObjectInSubtree,
  getColliderSize,
  sleep,
  withTimeout,
} from "Leaf.lspkg/Utils/common/Utils"
import {MessyHandsCardUI} from "../Scripts/MessyHandsCardUI"
import {MessyHandsMain} from "../Scripts/MessyHandsMain"

/** Scene object names authored by the bootstrap / built by the card UI. */
export const ROOT_NAME = "MessyHandsInbox"
export const CARD_NAME = "MessageCard"
export const DOT_NAME = "StatusDot"
export const HEADER_NAME = "HeaderText"
export const PANE_NAME = "PaneHost"
export const HINT_NAME = "MemoryHint"
export const DOUGH_NAME = "DoughBall"
export const COUNTER_TOP_NAME = "CounterTop"
export const COUNTER_ROOT_NAME = "CounterStandIn"

/**
 * How long a single pinch may take before it is called a failure.
 *
 * LEAF's trigger() awaits onHoverEnter, onTriggerStart and onTriggerEnd with no
 * timeout of its own, so a control that never receives a hover stalls the
 * scenario FOREVER rather than failing it. Measured once, the hard way: a run
 * sat in that state for eleven minutes without a verdict and had to be killed
 * by hand, which also blocks every scenario queued behind it.
 *
 * Six seconds is far longer than any tap in this suite needs (the slowest
 * measured is well under one) and short enough that a stuck suite reports
 * rather than hangs.
 */
const TAP_TIMEOUT_MS = 6000

/**
 * How long to wait after a pinch before doing anything else.
 *
 * Has to clear MessyHandsCardUI's REBUILD_DELAY_S (0.35 s), because almost
 * every pinch destroys the pane it was in and builds a new one, and a pinch
 * aimed at a control while that swap is still in flight never gets its hover.
 *
 * Two measurements set this number. At 300 ms - under the rebuild delay -
 * flow-empty-inbox hung outright on the "Who wrote" button that replaced a
 * just-removed message. At 500 ms it mostly worked: 2 full suite runs clean,
 * then memory-survives-refresh failed on the third with Btn-Remove never
 * receiving a hover. 150 ms of margin past the rebuild is evidently not enough
 * for SIK to finish releasing the destroyed control; 450 ms is.
 */
const TAP_SETTLE_MS = 800

export class MessyHandsLeafInteractor extends DefaultLeafInteractor {
  /** Pinches one of the card's buttons, e.g. "Btn-Start" or "Sender-Mom". */
  async tap(objectName: string): Promise<void> {
    const target = await waitForControl(objectName)
    await withTimeout(
      this.trigger(target),
      TAP_TIMEOUT_MS,
      'Pinch on "' +
        objectName +
        '" never completed within ' +
        TAP_TIMEOUT_MS +
        "ms - the control exists in the hierarchy but never received a hover"
    )
    await sleep(TAP_SETTLE_MS)
  }

  /** True when a card control with that name is currently on the card. */
  hasControl(objectName: string): boolean {
    return findInteractablesByName(objectName, undefined, true).length > 0
  }
}

/**
 * Waits for a card control to exist rather than assuming a settle time.
 *
 * The card rebuilds its rows on a frame-driven timer, while LEAF's sleep()
 * counts wall-clock. Anything that stalls frames - loading the IK avatar, for
 * instance - breaks a fixed sleep but not this poll.
 *
 * It waits for the control to be STABLE, not merely present: the same object
 * found on two consecutive polls. A control that appears for one poll and is
 * then replaced by the next rebuild is a control that will be destroyed under
 * the pinch, and SIK answers that with a hover that never arrives.
 */
export async function waitForControl(
  objectName: string,
  timeoutMs: number = 5000
): Promise<Interactable> {
  const stepMs = 100
  let waited = 0
  let stableCount = 0
  let lastSeen: Interactable | null = null

  while (waited < timeoutMs) {
    // A collider is required, not optional. UIKit's Button creates its
    // Interactable first and its collider child a beat later, and an
    // Interactable with no collider can neither be hovered nor counted as a
    // touch target - it is a control that exists but cannot be hit. Waiting
    // for the collider is what makes "the control is ready" true rather than
    // merely "the object is there".
    const matches = findInteractablesByName(objectName, undefined, true).filter(
      (i) => i.colliders.length > 0
    )
    if (matches.length > 0) {
      // The newest object is the one the last rebuild appended, so take the
      // last match rather than the first. During a pane swap both the outgoing
      // and incoming control can be present for a frame, and handing back the
      // outgoing one gives a control that is about to be destroyed - which
      // then never receives a hover and stalls the pinch.
      const candidate = matches[matches.length - 1]
      if (lastSeen === candidate) {
        stableCount++
      } else {
        lastSeen = candidate
        stableCount = 1
      }
      // Seen twice in a row with nothing else appearing: the rebuild is done.
      if (stableCount >= 2) return candidate
    } else {
      lastSeen = null
      stableCount = 0
    }
    await sleep(stepMs)
    waited += stepMs
  }

  const finalMatches = findInteractablesByName(objectName, undefined, true)
  let withColliders = 0
  for (const m of finalMatches) if (m.colliders.length > 0) withColliders++
  throw new Error(
    'Interactable "' +
      objectName +
      '" did not settle within ' +
      timeoutMs +
      "ms (" +
      finalMatches.length +
      " enabled match(es) in the hierarchy, " +
      withColliders +
      " with a collider)"
  )
}

/** The MessyHandsMain component driving the experience. */
export function getMain(): MessyHandsMain {
  const root = findSceneObjectByName(ROOT_NAME)
  if (!root) throw new Error('Scene object "' + ROOT_NAME + '" not found')
  const main = root.getComponent(MessyHandsMain.getTypeName()) as MessyHandsMain
  if (!main) throw new Error("MessyHandsMain component not found on " + ROOT_NAME)
  return main
}

/**
 * Back to three unread messages, not yet started.
 *
 * Waits for the card to have actually rebuilt, rather than sleeping and hoping.
 * resetDemo() swaps the card to the idle pane through the same deferred
 * rebuild every state change uses, so for REBUILD_DELAY_S afterwards the pane
 * is mid-swap: the old rows destroyed, the new ones not yet created. A fixed
 * 400 ms sleep sat 50 ms past that boundary and design-target-size duly
 * reported "idle control count Expected 1, Received 0" on one run in six.
 *
 * The idle pane always offers Start, so waiting for Start to be stable is a
 * precise signal that the rebuild finished - and if it never appears, reset
 * itself is broken and every scenario should say so loudly.
 */
export async function resetLens(): Promise<void> {
  getMain().resetDemo()
  await waitForControl("Btn-Start")
  await sleep(200)
}

/** The persistent count line, e.g. "3 messages". */
export function headerText(): string {
  const obj = findSceneObjectByName(HEADER_NAME)
  if (!obj) throw new Error('Scene object "' + HEADER_NAME + '" not found')
  const text = obj.getComponent("Component.Text") as Text
  return text.text
}

/** The status dot's current colour. */
export function dotColor(): vec4 {
  const obj = findSceneObjectByName(DOT_NAME)
  if (!obj) throw new Error('Scene object "' + DOT_NAME + '" not found')
  const image = obj.getComponent("Component.Image") as Image
  return image.mainPass.baseColor
}

/** Everything the changing half of the card currently reads, joined. */
export function paneText(): string {
  const pane = findSceneObjectByName(PANE_NAME)
  if (!pane) throw new Error('Scene object "' + PANE_NAME + '" not found')
  const parts: string[] = []
  collectText(pane, parts)
  return parts.join(" | ")
}

function collectText(obj: SceneObject, out: string[]): void {
  const text = obj.getComponent("Component.Text") as Text
  if (text && text.text.length > 0) out.push(text.text)
  for (let i = 0; i < obj.getChildrenCount(); i++) {
    collectText(obj.getChild(i), out)
  }
}

// ═══ Shared checks used by more than one scenario ═══════════════════════════

/** The card component itself, for its configured sizes and colours. */
export function getCard(): MessyHandsCardUI {
  const obj = findSceneObjectByName(CARD_NAME)
  if (!obj) throw new Error('Scene object "' + CARD_NAME + '" not found')
  const card = obj.getComponent(MessyHandsCardUI.getTypeName()) as MessyHandsCardUI
  if (!card) throw new Error("MessyHandsCardUI component not found on " + CARD_NAME)
  return card
}

/** A named scene object under the card, or null. Used to assert a row exists. */
export function findCardObject(name: string): SceneObject | null {
  const card = findSceneObjectByName(CARD_NAME)
  if (!card) throw new Error('Scene object "' + CARD_NAME + '" not found')
  let found: SceneObject | null = null
  forEachSceneObjectInSubtree(card, (obj: SceneObject) => {
    if (found === null && obj.name === name) found = obj
  })
  return found
}

/** The text of a named row on the card, or null when that row is not shown. */
export function cardRowText(name: string): string | null {
  const obj = findCardObject(name)
  if (!obj) return null
  const text = obj.getComponent("Component.Text") as Text
  return text ? text.text : null
}

/** Every Text component currently on the card, in hierarchy order. */
export function cardTexts(): Text[] {
  const card = findSceneObjectByName(CARD_NAME)
  if (!card) throw new Error('Scene object "' + CARD_NAME + '" not found')
  const out: Text[] = []
  forEachSceneObjectInSubtree(card, (obj: SceneObject) => {
    const t = obj.getComponent("Component.Text") as Text
    if (t && t.text.length > 0) out.push(t)
  })
  return out
}

/**
 * Glyph height in cm for a Component.Text.
 *
 * Component.Text.size is the em-square height in SnapOS type units, and
 * 43.886 units is one centimetre of em at unit scale - the same constant the
 * card uses to pick its sizes. The card's own scale is 1, so no world-scale
 * correction is needed; the assertion below checks that assumption rather than
 * trusting it.
 */
export const TYPE_UNITS_PER_CM = 43.886

export function emHeightCm(t: Text): number {
  return t.size / TYPE_UNITS_PER_CM
}

/**
 * Every tappable control currently on the card (enabled, with a collider).
 *
 * Walks the live scene graph rather than asking SIK's InteractionManager.
 * getInteractables() reads the manager's registry, and the card destroys and
 * rebuilds its rows on every state change - measured: right after Start the
 * registry still listed the destroyed Start button alongside its replacement,
 * so a per-pane control count came back 2 instead of 1. The hierarchy has no
 * such lag: a destroyed SceneObject is simply not in it.
 *
 * The CARD ITSELF is excluded. UIKit's BackPlate puts an Interactable and an
 * InteractionPlane on the plate, so pinches land on the panel instead of
 * falling through it - but the plate has no action and is not something the
 * user aims at, so counting it as a "touch target" would be wrong. It is
 * checked on its own by cardPlate() below, so nothing is being hidden.
 */
export function cardControls(): Interactable[] {
  const card = findSceneObjectByName(CARD_NAME)
  if (!card) throw new Error('Scene object "' + CARD_NAME + '" not found')
  const found = findInteractables(
    (obj: SceneObject) => (obj.getComponents(Interactable.getTypeName()) as Interactable[])[0],
    card,
    true
  )
  return found.filter((i) => i.colliders.length > 0 && i.getSceneObject().name !== CARD_NAME)
}

/** The card's own surface interactable, the one cardControls() leaves out. */
export function cardPlate(): Interactable | null {
  const card = findSceneObjectByName(CARD_NAME)
  if (!card) throw new Error('Scene object "' + CARD_NAME + '" not found')
  const plates = card.getComponents(Interactable.getTypeName()) as Interactable[]
  return plates.length > 0 ? plates[0] : null
}

/**
 * The hit zone of one control, in cm, as the collider actually describes it.
 *
 * Deliberately the collider and not the Button's authored `size`: the collider
 * is what a hand or a ray has to land on, so a button whose size was set but
 * whose collider lagged behind would pass an authored-size check and still be
 * unhittable.
 */
export function controlSizeCm(interactable: Interactable): vec3 {
  const collider = interactable.colliders[0]
  const local = getColliderSize(collider)
  const scale = interactable.getSceneObject().getTransform().getWorldScale()
  return new vec3(
    Math.abs(local.x * scale.x),
    Math.abs(local.y * scale.y),
    Math.abs(local.z * scale.z)
  )
}

/** The world camera - the user's eye. */
export function eyeCamera(): Camera {
  return WorldCameraFinderProvider.getInstance().getComponent()
}

/** Where the preview camera actually is right now. */
export function livePreviewEye(): vec3 {
  return WorldCameraFinderProvider.getInstance().getWorldPosition()
}

/**
 * The eye position every geometry check measures from: the world origin.
 *
 * devpost/design-brief.md and the bootstrap both place the user's eyes at
 * (0, 0, 0) and lay the whole kitchen out relative to that - the counter at
 * y = -70, the dough 55 cm forward, the card 26 cm right of it. So the design
 * claims (the card never covers the dough, the type is big enough at this
 * distance, the controls are in reach) are claims about THAT eye.
 *
 * Deliberately not the live preview camera. The preview camera is a developer's
 * free-fly view: moving it to take a screenshot silently re-measures the whole
 * scene. Measured, the hard way - a capture pass left the camera at
 * (8, -14, -8) and the dough's azimuth span moved from -12.4..12.4 to
 * -25.8..3.0, which failed an occlusion assertion that had nothing wrong with
 * it. Scenarios log livePreviewEye() alongside, so a reader can see whether
 * the two coincided on that run.
 */
export function authoredEye(): vec3 {
  return new vec3(0, 0, 0)
}

/** Kept as the old name so existing call sites read the authored eye. */
export function eyePosition(): vec3 {
  return authoredEye()
}

/** The eight world-space corners of a RenderMeshVisual's runtime AABB. */
export function visualCorners(objectName: string): vec3[] {
  const obj = findSceneObjectByName(objectName)
  if (!obj) throw new Error('Scene object "' + objectName + '" not found')
  const visual = obj.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
  if (!visual) throw new Error("No RenderMeshVisual on " + objectName)
  const lo = visual.worldAabbMin()
  const hi = visual.worldAabbMax()
  const out: vec3[] = []
  for (const x of [lo.x, hi.x]) {
    for (const y of [lo.y, hi.y]) {
      for (const z of [lo.z, hi.z]) out.push(new vec3(x, y, z))
    }
  }
  return out
}

/** The card's four world-space corners, taken through its own pitched transform. */
export function cardCorners(): vec3[] {
  const obj = findSceneObjectByName(CARD_NAME)
  if (!obj) throw new Error('Scene object "' + CARD_NAME + '" not found')
  const card = getCard()
  const toWorld = obj.getTransform().getWorldTransform()
  const hw = card.cardWidthCm * 0.5
  const hh = card.cardHeightCm * 0.5
  return [
    toWorld.multiplyPoint(new vec3(-hw, -hh, 0)),
    toWorld.multiplyPoint(new vec3(hw, -hh, 0)),
    toWorld.multiplyPoint(new vec3(-hw, hh, 0)),
    toWorld.multiplyPoint(new vec3(hw, hh, 0)),
  ]
}

/** Azimuth (right-positive) and elevation (up-positive) of a point, in degrees. */
export interface Bearing {
  azimuthDeg: number
  elevationDeg: number
  distanceCm: number
}

export function bearingFromEye(point: vec3, eye: vec3): Bearing {
  const d = point.sub(eye)
  // Looking along -Z, so forward distance is -d.z.
  const forward = -d.z
  const horizontal = Math.sqrt(d.x * d.x + forward * forward)
  return {
    azimuthDeg: (Math.atan2(d.x, forward) * 180) / Math.PI,
    elevationDeg: (Math.atan2(d.y, horizontal) * 180) / Math.PI,
    distanceCm: d.length,
  }
}

/** The angular box a set of world points occupies, as seen from the eye. */
export interface AngularBox {
  minAz: number
  maxAz: number
  minEl: number
  maxEl: number
  minDistanceCm: number
  maxDistanceCm: number
}

export function angularBox(points: vec3[], eye: vec3): AngularBox {
  let minAz = 1e9
  let maxAz = -1e9
  let minEl = 1e9
  let maxEl = -1e9
  let minD = 1e9
  let maxD = -1e9
  for (const p of points) {
    const b = bearingFromEye(p, eye)
    minAz = Math.min(minAz, b.azimuthDeg)
    maxAz = Math.max(maxAz, b.azimuthDeg)
    minEl = Math.min(minEl, b.elevationDeg)
    maxEl = Math.max(maxEl, b.elevationDeg)
    minD = Math.min(minD, b.distanceCm)
    maxD = Math.max(maxD, b.distanceCm)
  }
  return {minAz: minAz, maxAz: maxAz, minEl: minEl, maxEl: maxEl, minDistanceCm: minD, maxDistanceCm: maxD}
}

/** Half-angles of the camera's view cone, in degrees. */
export function halfFovDeg(camera: Camera): {horizontal: number; vertical: number} {
  const vertical = (camera.fov * 180) / Math.PI / 2
  const halfHeight = Math.tan(camera.fov / 2)
  const horizontal = (Math.atan(halfHeight * camera.aspect) * 180) / Math.PI
  return {horizontal: horizontal, vertical: vertical}
}

/** Reads the first "Row" text under a named parent, for pane-specific checks. */
export function hasCardControl(name: string): boolean {
  return findInteractablesByName(name, undefined, true).length > 0
}
