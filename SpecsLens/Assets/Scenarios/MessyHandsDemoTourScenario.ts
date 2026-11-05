/**
 * Proves: the whole demo runs start to finish in one unbroken pass - start, who
 * wrote, open Mom, speak, send, remove - with every step held long enough to
 * film, and the right thing on the card at every pause.
 *
 * This is the scenario to run while recording. The others each prove one thing
 * and move on; this one is the walkthrough, and it is the only one that asserts
 * the steps in the order a viewer sees them. Every pause is a real dwell, so a
 * screen recording of this run is a usable demo video with no editing - roughly
 * 40 seconds at the default pause.
 *
 * It ends by resetting, so the recording can be taken twice without the second
 * take opening on two messages.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  dotColor,
  getCard,
  getMain,
  headerText,
  MessyHandsLeafInteractor,
  paneText,
  resetLens,
} from "./MessyHandsLeafInteractor"

/** Long enough for a viewer to read the card before it changes. */
const DEFAULT_PAUSE_MS = 2200

@component
export class MessyHandsDemoTourScenario extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const pause = this.pauseFrom(config)
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const card = getCard()
    const mom = SAMPLE_MESSAGES[0]
    const alex = SAMPLE_MESSAGES[1]
    console.log("[demo-tour] pause between steps: " + pause + " ms")

    // ── 1. The card is already there, waiting, before anything is pressed ──
    console.log("[demo-tour] 1/7 waiting: grey dot, the count, and who wrote last")
    expect(main.getPhase()).toBe("idle")
    expect(headerText()).toBe("3 messages")
    expect(paneText().includes(mom.sender)).toBe(true)
    const grey = dotColor()
    expect(grey.g).toBeCloseTo(card.idleDotColor.g, 2)
    await sleep(pause)

    // ── 2. Start: the dot goes green ──────────────────────────────────────
    console.log("[demo-tour] 2/7 start: the dot turns green")
    await interactor.tap("Btn-Start")
    await sleep(pause)
    expect(main.getPhase()).toBe("ready")
    const green = dotColor()
    expect(green.g).toBeCloseTo(card.readyDotColor.g, 2)
    expect(green.g > grey.g).toBe(true)

    // ── 3. Who wrote: three names, each a big target ──────────────────────
    console.log("[demo-tour] 3/7 who wrote: three names")
    await interactor.tap("Btn-Who wrote")
    await sleep(pause)
    expect(main.getPhase()).toBe("senders")
    const listed = paneText()
    for (const m of SAMPLE_MESSAGES) {
      expect(listed.includes(m.sender)).toBe(true)
      expect(interactor.hasControl("Sender-" + m.sender)).toBe(true)
    }

    // ── 4. Open Mom: her whole message ───────────────────────────────────
    console.log("[demo-tour] 4/7 open Mom: the full message")
    await interactor.tap("Sender-" + mom.sender)
    await sleep(pause)
    expect(main.getPhase()).toBe("message")
    const opened = paneText()
    expect(opened.includes(mom.sender)).toBe(true)
    expect(opened.includes(mom.text)).toBe(true)
    expect(interactor.hasControl("Btn-Speak")).toBe(true)

    // ── 5. Speak: the gist, and the rewrite under it ─────────────────────
    console.log("[demo-tour] 5/7 speak: the gist rewritten into a clean reply")
    await interactor.tap("Btn-Speak")
    await sleep(pause)
    expect(main.getPhase()).toBe("draft")
    const drafted = paneText()
    expect(drafted.includes(mom.gist)).toBe(true)
    expect(drafted.includes(mom.reply)).toBe(true)
    expect(mom.reply === mom.gist).toBe(false)

    // ── 6. Send: the sent state, then it leaves on its own ──────────────
    console.log("[demo-tour] 6/7 send: Sent, then back to the summary by itself")
    await interactor.tap("Btn-Send")
    // Checked immediately, with no pause of its own: the sent state only lives
    // for sentHoldSeconds (2 s by default) and tap() already spends most of a
    // second settling. Adding a pause here read the card AFTER the hold had
    // expired and reported "ready" where "sent" was expected - a test that was
    // too slow to see the thing it was testing.
    expect(main.getPhase()).toBe("sent")
    expect(paneText().includes(card.sentLabel)).toBe(true)
    // Wait out the hold rather than pressing anything - hands are in dough.
    await sleep(main.sentHoldSeconds * 1000 + 1200)
    expect(main.getPhase()).toBe("ready")
    expect(main.getSenders().length).toBe(3)
    await sleep(pause)

    // ── 7. Remove: Alex's message goes, the count follows ───────────────
    console.log("[demo-tour] 7/7 remove: Alex goes, the card reads two")
    await interactor.tap("Btn-Who wrote")
    await sleep(pause * 0.5)
    await interactor.tap("Sender-" + alex.sender)
    await sleep(pause * 0.5)
    expect(main.getPhase()).toBe("message")
    await interactor.tap("Btn-Remove")
    await sleep(pause)

    expect(main.getPhase()).toBe("ready")
    expect(headerText()).toBe("2 messages")
    expect(main.getSenders().indexOf(alex.sender)).toBe(-1)

    // ── What the Lens now remembers, which is the part a video cannot show ─
    const remembered = main.getRemembered()
    expect(remembered.sent.length).toBe(1)
    expect(remembered.sent[0]).toBe(mom.id)
    expect(remembered.removed.length).toBe(1)
    expect(remembered.removed[0]).toBe(alex.id)
    console.log(
      "[demo-tour] done. Remembered for next time: replied to " +
        mom.sender +
        ", cleared " +
        alex.sender
    )

    // Clean slate for a second take.
    await resetLens()
    expect(headerText()).toBe("3 messages")
  }

  /**
   * Pause length, overridable from the LEAF panel or the MCP tool as `pauseMs`
   * (declared with a default in LeafIndex), so a run can be slowed down for a
   * recording without editing the scenario. Anything under 200 ms is rejected:
   * the whole point of this scenario is that the pauses are real.
   */
  private pauseFrom(config?: ScenarioConfig): number {
    const requested = config ? config.getNumber("pauseMs") : undefined
    if (requested === undefined || requested < 200) return DEFAULT_PAUSE_MS
    return requested
  }
}
