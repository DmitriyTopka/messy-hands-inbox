/**
 * LeafIndex - registers the Messy Hands Inbox test suite with LEAF.
 *
 * 23 scenarios in four groups, each id saying what it proves:
 *
 *   criterion-*   the five done criteria from devpost/design-brief.md
 *   flow-*        the states the happy path never visits: empty, repeated,
 *                 out-of-phase, timed out
 *   memory-*      what survives a Lens restart, and what reset wipes
 *   design-*      the claims a judge can see: readable type, 4 cm targets,
 *                 the card never over the work, reach from two body heights
 *   demo-tour     the whole walkthrough in one filmable pass
 *
 * Scenarios run sequentially against one live Lens, so each one calls
 * resetDemo() first - which now also clears persistent storage, so no scenario
 * inherits either the previous one's state or a demo left over from yesterday.
 *
 * Six of these need no scene at all (the memory-store, remembered-sets,
 * truncation and inbox-logic ones are pure logic over MessyHandsInbox and
 * MessyHandsMemory); they still run through LEAF so the whole suite is one
 * command and one report.
 */

import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {MessyHandsCardPlacementScenario} from "./MessyHandsCardPlacementScenario"
import {MessyHandsDemoTourScenario} from "./MessyHandsDemoTourScenario"
import {MessyHandsEmptyInboxScenario} from "./MessyHandsEmptyInboxScenario"
import {MessyHandsInboxLogicScenario} from "./MessyHandsInboxLogicScenario"
import {MessyHandsMemoryResetScenario} from "./MessyHandsMemoryResetScenario"
import {MessyHandsMemoryStoreScenario} from "./MessyHandsMemoryStoreScenario"
import {MessyHandsMemorySurvivesScenario} from "./MessyHandsMemorySurvivesScenario"
import {MessyHandsOcclusionScenario} from "./MessyHandsOcclusionScenario"
import {MessyHandsReachScenario} from "./MessyHandsReachScenario"
import {MessyHandsReadabilityScenario} from "./MessyHandsReadabilityScenario"
import {MessyHandsRememberedSetsScenario} from "./MessyHandsRememberedSetsScenario"
import {MessyHandsRemoveFromDraftScenario} from "./MessyHandsRemoveFromDraftScenario"
import {MessyHandsRemoveScenario} from "./MessyHandsRemoveScenario"
import {MessyHandsReplyScenario} from "./MessyHandsReplyScenario"
import {MessyHandsResetTwiceScenario} from "./MessyHandsResetTwiceScenario"
import {MessyHandsSeatedReachScenario} from "./MessyHandsSeatedReachScenario"
import {MessyHandsSentTimeoutScenario} from "./MessyHandsSentTimeoutScenario"
import {MessyHandsStartTwiceScenario} from "./MessyHandsStartTwiceScenario"
import {MessyHandsStatusDotScenario} from "./MessyHandsStatusDotScenario"
import {MessyHandsTargetSizeScenario} from "./MessyHandsTargetSizeScenario"
import {MessyHandsTruncationScenario} from "./MessyHandsTruncationScenario"
import {MessyHandsWhoWroteScenario} from "./MessyHandsWhoWroteScenario"
import {MessyHandsWrongPhaseScenario} from "./MessyHandsWrongPhaseScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    // ── The five done criteria ───────────────────────────────────────────────
    {
      // Grey dot at start, green after Start.
      id: "criterion-1-status-dot",
      typename: MessyHandsStatusDotScenario.getTypeName(),
    },
    {
      // The card lies right of and below the dough, reads "3 messages", and
      // leaves a real gap between its left edge and the dough's right edge.
      id: "criterion-2-card-placement",
      typename: MessyHandsCardPlacementScenario.getTypeName(),
    },
    {
      // "Who wrote" lists three names; pinching one opens that message.
      id: "criterion-3-who-wrote",
      typename: MessyHandsWhoWroteScenario.getTypeName(),
    },
    {
      // Speak shows the gist rewritten; Send shows it sent, and sends nothing.
      id: "criterion-4-reply-and-send",
      typename: MessyHandsReplyScenario.getTypeName(),
    },
    {
      // Remove drops that message and the card reads one fewer.
      id: "criterion-5-remove",
      typename: MessyHandsRemoveScenario.getTypeName(),
    },

    // ── The states the happy path never reaches ─────────────────────────────
    {
      // Removing all three leaves an empty inbox that says so and offers no rows.
      id: "flow-empty-inbox",
      typename: MessyHandsEmptyInboxScenario.getTypeName(),
    },
    {
      // Start cannot be pressed twice into a broken state.
      id: "flow-start-twice",
      typename: MessyHandsStartTwiceScenario.getTypeName(),
    },
    {
      // Remove works with a reply draft already on screen.
      id: "flow-remove-while-draft-open",
      typename: MessyHandsRemoveFromDraftScenario.getTypeName(),
    },
    {
      // The "Sent" state expires back to the summary with no input at all.
      id: "flow-sent-times-out",
      typename: MessyHandsSentTimeoutScenario.getTypeName(),
    },
    {
      // Every command is ignored outside its own phase, in all six phases.
      id: "flow-wrong-phase-ignored",
      typename: MessyHandsWrongPhaseScenario.getTypeName(),
    },
    {
      // Reset is idempotent, twice in a row and after real damage.
      id: "flow-reset-twice",
      typename: MessyHandsResetTwiceScenario.getTypeName(),
    },
    {
      // A long message is cut on the compact card so the buttons stay on it.
      id: "flow-long-message-truncated",
      typename: MessyHandsTruncationScenario.getTypeName(),
    },
    {
      // The inbox's own counting, opening, closing and removing rules.
      id: "flow-inbox-logic",
      typename: MessyHandsInboxLogicScenario.getTypeName(),
    },

    // ── What survives the Lens being closed ────────────────────────────────
    {
      // A reply and a removal reach real storage, and the start-time restore
      // path brings them back. Leaves its state for the manual refresh check.
      id: "memory-survives-refresh",
      typename: MessyHandsMemorySurvivesScenario.getTypeName(),
    },
    {
      // Reset clears the store too, so the next start is a fresh three.
      id: "memory-cleared-by-reset",
      typename: MessyHandsMemoryResetScenario.getTypeName(),
    },
    {
      // The storage layer itself: write, read back, forget, and no-storage.
      id: "memory-store-roundtrip",
      typename: MessyHandsMemoryStoreScenario.getTypeName(),
    },
    {
      // Removed stays gone; replied comes back marked. The one product call.
      id: "memory-removed-vs-replied",
      typename: MessyHandsRememberedSetsScenario.getTypeName(),
    },

    // ── The design claims a judge can check ────────────────────────────────
    {
      // Nothing on the card is small or faded, in any of its seven states.
      id: "design-readability",
      typename: MessyHandsReadabilityScenario.getTypeName(),
    },
    {
      // Every tappable thing is at least 4 cm, measured off its collider.
      id: "design-target-size",
      typename: MessyHandsTargetSizeScenario.getTypeName(),
    },
    {
      // The card cannot cover the dough from any head angle, and both fit in view.
      id: "design-card-never-covers-dough",
      typename: MessyHandsOcclusionScenario.getTypeName(),
    },
    {
      // A standing user's arm converges on the card's full-width controls (IK).
      id: "reach-standing-user",
      typename: MessyHandsReachScenario.getTypeName(),
    },
    {
      // And a seated one's does, with the kitchen 40 cm higher relative to the eye.
      id: "reach-seated-user",
      typename: MessyHandsSeatedReachScenario.getTypeName(),
    },

    // ── The whole walkthrough, in one filmable pass ────────────────────────
    {
      // Start, who wrote, open Mom, speak, send, remove - with real pauses.
      id: "demo-tour",
      typename: MessyHandsDemoTourScenario.getTypeName(),
      parameters: {pauseMs: "2200"},
    },
  ]
}
