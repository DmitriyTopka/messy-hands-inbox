/**
 * Proves: the inbox's own rules hold with no scene at all - counting, opening,
 * closing, removing, and every way a caller can ask for something that is not
 * there.
 *
 * These are the paths the voice route reaches with a misheard word and the ones
 * a card rebuild reaches mid-destroy. They are cheap to check here and expensive
 * to find in a demo.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {MessyHandsInbox} from "../Scripts/MessyHandsInbox"
import {SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"

@component
export class MessyHandsInboxLogicScenario extends Scenario {
  async run(): Promise<void> {
    const inbox = new MessyHandsInbox()

    // ── Before anything is loaded ──────────────────────────────────────────
    expect(inbox.count).toBe(0)
    expect(inbox.headerLine()).toBe("No messages")
    expect(inbox.current()).toBeNull()
    expect(inbox.openAt(0)).toBe(false)
    expect(inbox.removeCurrent()).toBe(false)
    expect(inbox.markCurrentSent()).toBe(false)
    expect(inbox.currentWasSent()).toBe(false)
    inbox.close() // must not throw with nothing open

    // ── Counting, including the singular ──────────────────────────────────
    inbox.load(SAMPLE_MESSAGES)
    expect(inbox.count).toBe(3)
    expect(inbox.headerLine()).toBe("3 messages")
    expect(inbox.senders().length).toBe(3)
    expect(inbox.senders()[0]).toBe("Mom")
    expect(inbox.senders()[2]).toBe("Work chat")

    // senders() hands back a copy, not the live array.
    const names = inbox.senders()
    names.push("Intruder")
    expect(inbox.senders().length).toBe(3)

    // ── Opening ──────────────────────────────────────────────────────────
    expect(inbox.openAt(-1)).toBe(false)
    expect(inbox.openAt(3)).toBe(false)
    expect(inbox.openAt(99)).toBe(false)
    expect(inbox.current()).toBeNull()

    expect(inbox.openAt(1)).toBe(true)
    const open = inbox.current()
    expect(open).not.toBeNull()
    expect((open as {sender: string}).sender).toBe("Alex")

    // close() puts it back to nothing open, without removing anything.
    inbox.close()
    expect(inbox.current()).toBeNull()
    expect(inbox.count).toBe(3)

    // ── Removing re-indexes the rest ─────────────────────────────────────
    expect(inbox.openAt(0)).toBe(true)
    expect(inbox.removeCurrent()).toBe(true)
    expect(inbox.count).toBe(2)
    expect(inbox.headerLine()).toBe("2 messages")
    expect(inbox.senders()[0]).toBe("Alex")
    // Nothing is open after a removal, so a second one is refused.
    expect(inbox.current()).toBeNull()
    expect(inbox.removeCurrent()).toBe(false)

    // The snippet follows the new newest message.
    expect(inbox.snippet().indexOf("Alex: ")).toBe(0)

    // Down to one: singular.
    expect(inbox.openAt(0)).toBe(true)
    expect(inbox.removeCurrent()).toBe(true)
    expect(inbox.count).toBe(1)
    expect(inbox.headerLine()).toBe("1 message")
    expect(inbox.senders()[0]).toBe("Work chat")

    // Down to none.
    expect(inbox.openAt(0)).toBe(true)
    expect(inbox.removeCurrent()).toBe(true)
    expect(inbox.count).toBe(0)
    expect(inbox.headerLine()).toBe("No messages")
    expect(inbox.snippet()).toBe("Nothing waiting for you.")
    expect(inbox.openAt(0)).toBe(false)

    // All three removals were remembered.
    expect(inbox.removedIds().length).toBe(3)

    // ── load() wipes the open index and the remembered sets ─────────────
    inbox.load(SAMPLE_MESSAGES)
    expect(inbox.count).toBe(3)
    expect(inbox.current()).toBeNull()
    expect(inbox.removedIds().length).toBe(0)
    expect(inbox.sentIds().length).toBe(0)

    // ── Loading does not alias the caller's array ──────────────────────
    expect(SAMPLE_MESSAGES.length).toBe(3)
    inbox.openAt(0)
    inbox.removeCurrent()
    expect(inbox.count).toBe(2)
    expect(SAMPLE_MESSAGES.length).toBe(3)
  }
}
