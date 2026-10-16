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
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {MessyHandsMain} from "../Scripts/MessyHandsMain"

/** Scene object names authored by the bootstrap / built by the card UI. */
export const ROOT_NAME = "MessyHandsInbox"
export const CARD_NAME = "MessageCard"
export const DOT_NAME = "StatusDot"
export const HEADER_NAME = "HeaderText"
export const PANE_NAME = "PaneHost"

export class MessyHandsLeafInteractor extends DefaultLeafInteractor {
  /** Pinches one of the card's buttons, e.g. "Btn-Start" or "Sender-Mom". */
  async tap(objectName: string): Promise<void> {
    const target = await waitForControl(objectName)
    await this.trigger(target)
    await sleep(300)
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
 */
export async function waitForControl(
  objectName: string,
  timeoutMs: number = 5000
): Promise<Interactable> {
  const stepMs = 100
  let waited = 0
  while (waited < timeoutMs) {
    const found = findInteractablesByName(objectName, undefined, true)[0]
    if (found) return found
    await sleep(stepMs)
    waited += stepMs
  }
  throw new Error(
    'Interactable "' + objectName + '" did not appear within ' + timeoutMs + "ms"
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

/** Back to three unread messages, not yet started. */
export async function resetLens(): Promise<void> {
  getMain().resetDemo()
  await sleep(400)
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
