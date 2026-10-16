/**
 * LeafIndex - registers the Messy Hands Inbox test suite with LEAF.
 *
 * One scenario per done criterion in devpost/design-brief.md, plus a
 * reachability pass. Scenarios run sequentially against one live Lens, so
 * each one calls resetDemo() first.
 */

import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {MessyHandsCardPlacementScenario} from "./MessyHandsCardPlacementScenario"
import {MessyHandsReachScenario} from "./MessyHandsReachScenario"
import {MessyHandsRemoveScenario} from "./MessyHandsRemoveScenario"
import {MessyHandsReplyScenario} from "./MessyHandsReplyScenario"
import {MessyHandsStatusDotScenario} from "./MessyHandsStatusDotScenario"
import {MessyHandsWhoWroteScenario} from "./MessyHandsWhoWroteScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {
      id: "criterion-1-status-dot",
      typename: MessyHandsStatusDotScenario.getTypeName(),
    },
    {
      id: "criterion-2-card-placement",
      typename: MessyHandsCardPlacementScenario.getTypeName(),
    },
    {
      id: "criterion-3-who-wrote",
      typename: MessyHandsWhoWroteScenario.getTypeName(),
    },
    {
      id: "criterion-4-reply-and-send",
      typename: MessyHandsReplyScenario.getTypeName(),
    },
    {
      id: "criterion-5-remove",
      typename: MessyHandsRemoveScenario.getTypeName(),
    },
    {
      id: "reach-standing-user",
      typename: MessyHandsReachScenario.getTypeName(),
    },
  ]
}
