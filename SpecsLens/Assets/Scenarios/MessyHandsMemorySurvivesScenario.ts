/**
 * Proves: a reply and a removal are written to real persistent storage, and the
 * exact code path the Lens runs on start restores them from it.
 *
 * WHAT THIS DOES AND DOES NOT PROVE
 *
 * It drives the real demo, then reads `global.persistentStorageSystem.store`
 * back and re-runs MessyHandsMain's own start-time restore over it. That covers
 * the write, the keys, the two different meanings of "sent" and "removed", and
 * the restore - every line that a restart would execute.
 *
 * The one thing it cannot do is restart the process: a LEAF scenario lives
 * inside the running Lens. So this scenario deliberately LEAVES its state in
 * the store and logs what a refresh should now show. Refreshing the preview
 * afterwards and reading `[MessyHandsMain] idle with 2 messages waiting;
 * remembered 1 replied, 1 cleared` in the log closes that last gap by hand -
 * the measurement is written up in devpost/build-notes.md.
 *
 * Leaving dirty state is safe for the suite: every scenario starts with
 * resetDemo(), which clears both the inbox and the store.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"
import {
  cardRowText,
  getMain,
  headerText,
  HINT_NAME,
  MessyHandsLeafInteractor,
  paneText,
  resetLens,
} from "./MessyHandsLeafInteractor"

@component
export class MessyHandsMemorySurvivesScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const interactor = new MessyHandsLeafInteractor()
    await resetLens()

    const main = getMain()
    const replied = SAMPLE_MESSAGES[0]
    const cleared = SAMPLE_MESSAGES[1]

    // This runtime has to be able to remember, or the scenario is meaningless.
    expect(main.getMemory().available).toBe(true)
    expect(main.getStoredState().sent.length).toBe(0)
    expect(main.getStoredState().removed.length).toBe(0)

    // Reply to the first message.
    await interactor.tap("Btn-Start")
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + replied.sender)
    await interactor.tap("Btn-Speak")
    await interactor.tap("Btn-Send")
    await sleep(400)

    // Written the moment it is sent, not at some later checkpoint.
    expect(main.getStoredState().sent.indexOf(replied.id)).not.toBe(-1)
    await sleep(main.sentHoldSeconds * 1000 + 1000)

    // Throw the second away.
    await interactor.tap("Btn-Who wrote")
    await interactor.tap("Sender-" + cleared.sender)
    await interactor.tap("Btn-Remove")
    await sleep(600)

    const stored = main.getStoredState()
    expect(stored.sent.length).toBe(1)
    expect(stored.sent[0]).toBe(replied.id)
    expect(stored.removed.length).toBe(1)
    expect(stored.removed[0]).toBe(cleared.id)
    expect(main.getMemory().hasAnything()).toBe(true)

    // ── The restart path, run against what is really on disk ────────────────
    const restored = main.reloadFromMemory()
    await sleep(600)

    expect(restored.sent[0]).toBe(replied.id)
    expect(restored.removed[0]).toBe(cleared.id)

    // Two messages, not three: the thrown-away one did not come back.
    expect(headerText()).toBe("2 messages")
    expect(main.getSenders().length).toBe(2)
    expect(main.getSenders().indexOf(cleared.sender)).toBe(-1)
    // The replied-to one DID come back - nothing was really sent.
    expect(main.getSenders().indexOf(replied.sender)).not.toBe(-1)

    // The card says why it is showing two.
    const hint = cardRowText(HINT_NAME)
    expect(hint).not.toBeNull()
    expect((hint as string).includes("1 replied")).toBe(true)
    expect((hint as string).includes("1 cleared")).toBe(true)

    // And an answered message is marked as answered when reopened.
    main.commandStart()
    main.commandWhoWrote()
    await sleep(500)
    expect(main.commandOpenSender(replied.sender)).toBe(true)
    await sleep(600)
    expect(paneText().includes("replied")).toBe(true)

    // Left on purpose for the manual refresh check - see the header comment.
    const handoff = main.getStoredState()
    console.log(
      "[memory-survives-refresh] left in storage: sent=" +
        handoff.sent.join(",") +
        " removed=" +
        handoff.removed.join(",") +
        " - a preview refresh should now log 2 messages, 1 replied, 1 cleared"
    )
    expect(handoff.sent.length).toBe(1)
    expect(handoff.removed.length).toBe(1)
  }
}
