/**
 * Proves: "removed" and "sent" are not the same thing - a thrown-away message
 * never comes back, a replied-to one comes back marked.
 *
 * This is the one product decision inside the memory feature. The demo never
 * really sends anything, so deleting a message the user only answered would
 * destroy a thread they can still read; while a message they deliberately
 * cleared has to stay gone or "remove" means nothing. Pure logic, no scene.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {MessyHandsInbox} from "../Scripts/MessyHandsInbox"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"

@component
export class MessyHandsRememberedSetsScenario extends Scenario {
  async run(): Promise<void> {
    const mom = SAMPLE_MESSAGES[0]
    const alex = SAMPLE_MESSAGES[1]
    const work = SAMPLE_MESSAGES[2]

    // ── A replied-to message comes back, and knows it was replied to ────────
    const withSent = new MessyHandsInbox()
    withSent.load(SAMPLE_MESSAGES, {sent: [mom.id], removed: []})
    expect(withSent.count).toBe(3)
    expect(withSent.headerLine()).toBe("3 messages")
    expect(withSent.openAt(0)).toBe(true)
    expect(withSent.currentWasSent()).toBe(true)
    expect(withSent.openAt(1)).toBe(true)
    expect(withSent.currentWasSent()).toBe(false)

    // ── A removed message does not come back at all ────────────────────────
    const withRemoved = new MessyHandsInbox()
    withRemoved.load(SAMPLE_MESSAGES, {sent: [], removed: [alex.id]})
    expect(withRemoved.count).toBe(2)
    expect(withRemoved.headerLine()).toBe("2 messages")
    expect(withRemoved.senders().indexOf(alex.sender)).toBe(-1)
    expect(withRemoved.senders()[0]).toBe(mom.sender)
    expect(withRemoved.senders()[1]).toBe(work.sender)
    // The id stays in the remembered set, so it is still gone next time.
    expect(withRemoved.removedIds().indexOf(alex.id)).not.toBe(-1)

    // ── Both at once, which is what a real second session looks like ───────
    const mixed = new MessyHandsInbox()
    mixed.load(SAMPLE_MESSAGES, {sent: [mom.id], removed: [alex.id]})
    expect(mixed.count).toBe(2)
    expect(mixed.senders()[0]).toBe(mom.sender)
    expect(mixed.openAt(0)).toBe(true)
    expect(mixed.currentWasSent()).toBe(true)
    expect(mixed.snippet().indexOf(mom.sender)).toBe(0)

    // ── Everything removed: a legitimately empty inbox ────────────────────
    const empty = new MessyHandsInbox()
    empty.load(SAMPLE_MESSAGES, {sent: [], removed: [mom.id, alex.id, work.id]})
    expect(empty.count).toBe(0)
    expect(empty.headerLine()).toBe("No messages")
    expect(empty.snippet()).toBe("Nothing waiting for you.")
    expect(empty.senders().length).toBe(0)
    expect(empty.current()).toBeNull()

    // ── Ids that are not ours are ignored, not crashed on ─────────────────
    const stale = new MessyHandsInbox()
    stale.load(SAMPLE_MESSAGES, {sent: ["gone-in-a-past-build"], removed: ["also-gone"]})
    expect(stale.count).toBe(3)
    expect(stale.openAt(0)).toBe(true)
    expect(stale.currentWasSent()).toBe(false)

    // ── Live transitions build exactly the state that gets written ────────
    const live = new MessyHandsInbox()
    live.load(SAMPLE_MESSAGES)
    expect(live.snapshot().sent.length).toBe(0)
    live.openAt(0)
    expect(live.markCurrentSent()).toBe(true)
    // Marking twice does not double up.
    live.markCurrentSent()
    expect(live.snapshot().sent.length).toBe(1)
    expect(live.count).toBe(3)
    live.openAt(1)
    expect(live.removeCurrent()).toBe(true)
    expect(live.count).toBe(2)
    const snap = live.snapshot()
    expect(snap.sent[0]).toBe(mom.id)
    expect(snap.removed[0]).toBe(alex.id)

    // Reloading from that snapshot reproduces the same inbox.
    const reloaded = new MessyHandsInbox()
    reloaded.load(SAMPLE_MESSAGES, snap)
    expect(reloaded.count).toBe(2)
    expect(reloaded.senders().indexOf(alex.sender)).toBe(-1)
    expect(reloaded.openAt(0)).toBe(true)
    expect(reloaded.currentWasSent()).toBe(true)
  }
}
