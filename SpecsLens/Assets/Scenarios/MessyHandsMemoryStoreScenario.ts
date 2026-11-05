/**
 * Proves: the storage layer itself - write, read back, forget, and the wording
 * of the card's hint - over a fake store, with no scene and no real disk.
 *
 * Runs without the scene on purpose. MessyHandsMemory takes its store as a
 * constructor argument precisely so this can be checked without writing to what
 * the live demo remembers, and so a runtime with no persistent storage at all
 * can be exercised (the null case below) rather than assumed.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {
  FakeMemoryStore,
  MessyHandsMemory,
  emptyState,
  hintLine,
} from "../Scripts/MessyHandsMemory"

@component
export class MessyHandsMemoryStoreScenario extends Scenario {
  async run(): Promise<void> {
    // ── A fresh store remembers nothing ─────────────────────────────────────
    const store = new FakeMemoryStore()
    const memory = new MessyHandsMemory(store)
    expect(memory.available).toBe(true)
    expect(memory.hasAnything()).toBe(false)
    const blank = memory.load()
    expect(blank.sent.length).toBe(0)
    expect(blank.removed.length).toBe(0)

    // ── Write, read back ────────────────────────────────────────────────────
    memory.save({sent: ["mom-sunday"], removed: ["alex-keys", "work-standup"]})
    expect(memory.hasAnything()).toBe(true)
    const back = memory.load()
    expect(back.sent.length).toBe(1)
    expect(back.sent[0]).toBe("mom-sunday")
    expect(back.removed.length).toBe(2)
    expect(back.removed[0]).toBe("alex-keys")
    expect(back.removed[1]).toBe("work-standup")

    // Two keys, not one blob - the shape the next Lens version has to read.
    expect(store.keys().length).toBe(2)

    // What comes back is a copy: mutating it must not change the store.
    back.sent.push("ghost")
    expect(memory.load().sent.length).toBe(1)

    // Overwriting replaces rather than appends.
    memory.save({sent: ["alex-keys"], removed: []})
    expect(memory.load().sent.length).toBe(1)
    expect(memory.load().sent[0]).toBe("alex-keys")
    expect(memory.load().removed.length).toBe(0)

    // ── Forget ──────────────────────────────────────────────────────────────
    memory.forget()
    expect(memory.hasAnything()).toBe(false)
    expect(store.keys().length).toBe(0)
    expect(memory.load().sent.length).toBe(0)
    // Forgetting twice is not an error.
    memory.forget()
    expect(memory.hasAnything()).toBe(false)

    // ── A runtime with no storage at all degrades, it does not throw ────────
    const forgetful = new MessyHandsMemory(null)
    expect(forgetful.available).toBe(false)
    expect(forgetful.hasAnything()).toBe(false)
    forgetful.save({sent: ["mom-sunday"], removed: []})
    expect(forgetful.load().sent.length).toBe(0)
    forgetful.forget()

    // ── The hint wording, in every case the card can hit ───────────────────
    expect(hintLine(emptyState())).toBe("")
    expect(hintLine({sent: ["a"], removed: []})).toBe("Last time: 1 replied")
    expect(hintLine({sent: [], removed: ["a"]})).toBe("Last time: 1 cleared")
    expect(hintLine({sent: ["a"], removed: ["b"]})).toBe("Last time: 1 replied, 1 cleared")
    expect(hintLine({sent: ["a", "b"], removed: ["c"]})).toBe("Last time: 2 replied, 1 cleared")
    // Short enough to sit on one row of a 22 cm card at Body size. 36
    // characters did not: it rendered against the plate's right edge.
    expect(hintLine({sent: ["a", "b"], removed: ["c"]}).length).toBeLessThan(33)
  }
}
