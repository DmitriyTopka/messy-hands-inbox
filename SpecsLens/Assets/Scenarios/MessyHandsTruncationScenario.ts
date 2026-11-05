/**
 * Proves: a long message is cut short on the compact card, so the snippet stays
 * one line and never pushes the button row off the card's lower edge.
 *
 * The real inbox would carry messages of any length. The compact pane gives the
 * snippet exactly the height left over after the status row and the button row,
 * so truncation is not cosmetic here - it is what keeps the controls reachable.
 *
 * Pure logic: this is the inbox's own rule, checked without the scene, then
 * confirmed against the card's live text in MessyHandsReadabilityScenario.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {MessyHandsInbox} from "../Scripts/MessyHandsInbox"
import {InboxMessage, SAMPLE_MESSAGES} from "../Scripts/MessyHandsSampleMessages"

/** The cap MessyHandsInbox applies to the body of the snippet. */
const SNIPPET_CHARS = 30

function message(id: string, sender: string, text: string): InboxMessage {
  return {id: id, sender: sender, text: text, gist: "ok", reply: "Okay."}
}

@component
export class MessyHandsTruncationScenario extends Scenario {
  async run(): Promise<void> {
    // ── A very long body is cut and marked as cut ──────────────────────────
    const longText =
      "Hi, just checking in about the thing we discussed last week, because I " +
      "need an answer before Friday and I could not reach you on the phone at " +
      "all yesterday evening, so please write back when you get a moment."
    expect(longText.length).toBeGreaterThan(150)

    const inbox = new MessyHandsInbox()
    inbox.load([message("long", "Sam", longText)])
    const snippet = inbox.snippet()

    expect(snippet.indexOf("Sam: ")).toBe(0)
    // Ends in an ellipsis, so the user can see there is more.
    expect(snippet.substring(snippet.length - 3)).toBe("...")
    // The whole body is not on the card.
    expect(snippet.includes(longText)).toBe(false)
    expect(snippet.includes("please write back")).toBe(false)
    // Body is capped: sender + ": " + at most 30 chars + "...".
    const body = snippet.substring("Sam: ".length)
    expect(body.length).toBeLessThan(SNIPPET_CHARS + 4)
    // And the whole line fits a 22 cm card at Body size - measured as ~44
    // characters per wrapped line, so one line is the budget.
    expect(snippet.length).toBeLessThan(45)

    // ── A short body is left alone, with no misleading ellipsis ────────────
    const shortInbox = new MessyHandsInbox()
    shortInbox.load([message("short", "Sam", "On my way.")])
    expect(shortInbox.snippet()).toBe("Sam: On my way.")

    // ── Exactly at the cap is not truncated ───────────────────────────────
    const exact = "x".repeat(SNIPPET_CHARS)
    const exactInbox = new MessyHandsInbox()
    exactInbox.load([message("exact", "Sam", exact)])
    expect(exactInbox.snippet()).toBe("Sam: " + exact)

    // One over the cap is.
    const over = "x".repeat(SNIPPET_CHARS + 1)
    const overInbox = new MessyHandsInbox()
    overInbox.load([message("over", "Sam", over)])
    expect(overInbox.snippet()).toBe("Sam: " + exact + "...")

    // ── Trailing whitespace is not left dangling before the ellipsis ──────
    // "Mom asked about Sunday lunch, " is exactly 30 characters and ends on a
    // space, so this is the one input where the trim() in snippet() matters.
    const spacedInbox = new MessyHandsInbox()
    spacedInbox.load([message("spaced", "Sam", "Mom asked about Sunday lunch, and pie")])
    const spacedSnippet = spacedInbox.snippet()
    expect(spacedSnippet).toBe("Sam: Mom asked about Sunday lunch,...")
    expect(spacedSnippet.includes(" ...")).toBe(false)

    // ── The real demo message is genuinely truncated ──────────────────────
    const demo = new MessyHandsInbox()
    demo.load(SAMPLE_MESSAGES)
    const demoSnippet = demo.snippet()
    expect(SAMPLE_MESSAGES[0].text.length).toBeGreaterThan(SNIPPET_CHARS)
    expect(demoSnippet).toBe("Mom: Are you coming on Sunday? I'll...")
    expect(demoSnippet.length).toBeLessThan(45)

    // ── An empty inbox has a line of its own, not an empty one ────────────
    const none = new MessyHandsInbox()
    none.load([])
    expect(none.snippet()).toBe("Nothing waiting for you.")
    expect(none.snippet().length).toBeGreaterThan(0)
  }
}
