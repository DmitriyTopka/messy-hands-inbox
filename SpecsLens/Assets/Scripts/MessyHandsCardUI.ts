/**
 * MessyHandsCardUI - the one message card that lies on the kitchen counter.
 *
 * Owns: the card surface (BackPlate), the status dot, the header count line,
 * and every pane the card can show (idle, compact, sender list, open message,
 * reply draft, sent). Built entirely from UIKit primitives.
 *
 * Does NOT own: which messages exist, which one is open, or when the sent
 * state expires. This is a passive view - MessyHandsMain pushes state in
 * through the public setters and listens to the public events below.
 *
 * @inputs: card size, dot colors, button height, sent label (all tunable).
 */

import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

// ── Assets (baked, not @input: the card always uses these) ───────────────────
const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material
const ICON_DOT = requireAsset("../Icons/circle.png") as Texture
const ICON_START = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_WHO = requireAsset("../Icons/group.png") as Texture
const ICON_SPEAK = requireAsset("../Icons/mic.png") as Texture
const ICON_SEND = requireAsset("../Icons/send.png") as Texture
const ICON_REMOVE = requireAsset("../Icons/delete.png") as Texture

// ── Typography: single source of truth for text size + weight ────────────────
// `Component.Text.size` is the glyph em-square height (em cm = size / 43.886).
// The SnapOS system scale is calibrated for reading at z = -110 cm, i.e. a panel
// held up near the face. This card does NOT live there: it lies flat-ish on a
// counter ~85 cm away and gets read at a glance, side-on, while the user's eyes
// are really on the dough.
//
// The first build sized the text by the system scale and then multiplied by
// 85/110, preserving the *visual angle* of a near-eye panel. That was the bug:
// it put Body at a 0.69 cm em, which reads fine held up at arm's length and is
// too small for a glance down at a counter. A counter card needs a bigger
// visual angle than a held panel, not the same one.
//
// So: no distance shrink, plus an explicit boost. Every glyph on the card is
// 1.45 / (85/110) = 1.88x the height it was.
const FONT_SIZE_SCALE = 1.45

type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"

const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1:      {size: 105, weight: 700},
  Title2:      {size: 93,  weight: 700},
  HeadlineXL:  {size: 62,  weight: 700},
  Headline1:   {size: 54,  weight: 700},
  Headline2:   {size: 48,  weight: 700},
  Subheadline: {size: 41,  weight: 700},
  Button:      {size: 39,  weight: 500},
  Callout:     {size: 39,  weight: 700},
  Body:        {size: 39,  weight: 500},
  Caption:     {size: 38,  weight: 500},
}

/**
 * Nothing on this card uses Caption or Body-at-system-size any more. The two
 * smallest roles were where the unreadable text lived, so the panes were moved
 * up the scale: snippet / message / draft are Body or Callout, the sender name
 * and the count line are Headline2, "Sent" is Headline1.
 */
function roleSize(role: TextRole): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE
}

function applyTextRole(t: Text, role: TextRole): void {
  t.size = roleSize(role)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

// Depth-buffer tie-breakers (not render order - the Canvas hierarchy DFS owns that).
const CONTENT_Z = 0.6       // content child, forward of the plate's front face
const BUTTON_LABEL_Z = 0.08 // content drawn ON a button face
const LAYOUT_Z_LIFT = 0.02

// Every colour here is near-white at full alpha, on purpose.
//
// The display is additive: it only ever ADDS light to what the eye already
// sees, so an alpha below 1 is a direct subtraction of contrast against a lit
// kitchen with nothing gained. The first build dimmed secondary text to 0.7
// alpha and tinted the draft a mid-green, both of which washed out. Hierarchy
// on this card now comes from size and weight, never from fading text.
const TEXT_PRIMARY = new vec4(1, 1, 1, 1)
const TEXT_SECONDARY = new vec4(0.95, 0.96, 1, 1)
const TEXT_DRAFT = new vec4(0.72, 1, 0.84, 1)

/** UI Kit paints button and row labels at 0.85 grey. Overridden to pure white. */
const TEXT_CONTROL = new vec4(1, 1, 1, 1)

/**
 * How long the card waits before swapping panes. A state change is always
 * raised from a button's own trigger callback, and the swap destroys that
 * button; tearing it down while SIK is still unwinding the pinch kills the
 * input event ("Object is null"). This is long enough for the interaction to
 * finish against a live object, short enough to read as instant.
 *
 * Raised from 0.12 s after the design fix. 0.12 s cleared the SCRIPTED
 * interactor, but not the PHYSICAL one: a real (or IK) hand keeps a
 * "recently ended" reference to the button it just pinched, and destroying
 * that button inside the window makes SIK's PhysicalInteractionProvider throw
 * "Object is null" every frame from clearRecentlyEndedStateIfNeeded - which
 * then stops the hand acquiring the button that replaced it. Measured: with
 * 0.12 s the IK reach test converged on "Who wrote" about half the time; the
 * scripted path never saw it, because it does not hold that state.
 */
const REBUILD_DELAY_S = 0.35

const PAD = 1.2
const STATUS_H = 3.4 // fits the Headline2 count line
const HEADER_H = 3.2
const ROOT_GAP = 0.7
const PANE_GAP = 0.5

/**
 * Sender rows share out whatever the pane has spare, so three names at this
 * type size get 5.5 cm each instead of the 4.4 cm floor. Capped so a one-
 * message inbox does not render a single 17 cm button.
 */
const SENDER_ROW_MAX = 6.5

/**
 * Button icon size in cm. UI Kit defaults to 1.5, which was proportionate to
 * the old small labels and reads as a speck next to the new ones. 2.4 cm gives
 * the icon the same visual weight as its label inside a 4.4 cm row.
 */
const CONTROL_ICON_CM = 2.4

/** What the card is currently showing. View state only - no domain data. */
type CardPane =
  | {kind: "idle"; snippet: string}
  | {kind: "compact"; snippet: string}
  | {kind: "senders"; senders: string[]}
  | {kind: "message"; sender: string; text: string}
  | {kind: "draft"; sender: string; said: string; draft: string}
  | {kind: "sent"; draft: string}

@component
export class MessyHandsCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">MessyHandsCardUI - the message card on the counter</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(14, 32, 0.5))
  @hint("Card width in cm. The brief's default is 22 cm.")
  cardWidthCm: number = 22

  @input
  @widget(new SliderWidget(12, 28, 0.5))
  @hint("Card height in cm. 24 cm fits the larger type: three 5.5 cm sender rows, or a wrapped message plus a draft plus the button row.")
  cardHeightCm: number = 24

  @input
  @widget(new SliderWidget(3, 7, 0.1))
  @hint("Height of every tappable target in cm. The brief asks for at least 4 cm.")
  buttonHeightCm: number = 4.4

  @input("vec4", "{0.62,0.64,0.68,1}")
  @widget(new ColorWidget())
  @hint("Status dot colour before the Lens is started (neutral grey).")
  idleDotColor: vec4

  @input("vec4", "{0.35,0.92,0.48,1}")
  @widget(new ColorWidget())
  @hint("Status dot colour once the Lens is ready (green).")
  readyDotColor: vec4

  @input
  @hint("Text shown on the card after a reply is sent.")
  sentLabel: string = "Sent"
  @ui.group_end

  // ── Public events: the card reports intent, it never decides ───────────────
  private _onStart = new Event<void>()
  private _onWhoWrote = new Event<void>()
  private _onSenderSelected = new Event<number>()
  private _onSpeak = new Event<void>()
  private _onSend = new Event<void>()
  private _onRemove = new Event<void>()

  get onStart(): PublicApi<void> { return this._onStart.publicApi() }
  get onWhoWrote(): PublicApi<void> { return this._onWhoWrote.publicApi() }
  get onSenderSelected(): PublicApi<number> { return this._onSenderSelected.publicApi() }
  get onSpeak(): PublicApi<void> { return this._onSpeak.publicApi() }
  get onSend(): PublicApi<void> { return this._onSend.publicApi() }
  get onRemove(): PublicApi<void> { return this._onRemove.publicApi() }

  // ── Built once ────────────────────────────────────────────────────────────
  private dotImage: Image | null = null
  private headerText: Text | null = null
  private paneHost: SceneObject | null = null
  private paneFlex: FlexLayout | null = null
  private paneItems: FlexItem[] = []
  private renderTimer: DelayedCallbackEvent | null = null

  // ── View state ────────────────────────────────────────────────────────────
  private pane: CardPane = {kind: "idle", snippet: ""}
  private headerLine: string = ""
  private ready: boolean = false

  onAwake(): void {
    this.build()
    const timer = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    timer.bind(() => this.renderPane())
    this.renderTimer = timer
    this.requestRender()
    this.applyDotColor()
  }

  /**
   * Rebuilds the pane on the next frame rather than right now.
   *
   * Every state change here is triggered from a button's own callback, and the
   * rebuild destroys that button. Destroying an interactable while the
   * interaction that fired it is still unwinding kills the input event mid-
   * flight ("Object is null"). One frame of delay lets the pinch finish
   * against a live object first.
   */
  private requestRender(): void {
    if (this.renderTimer) {
      this.renderTimer.reset(REBUILD_DELAY_S)
    } else {
      this.renderPane()
    }
  }

  // ═══ Public API - MessyHandsMain pushes state in ═══════════════════════════

  /** Status dot: neutral grey until the Lens is started, green once ready. */
  setReady(ready: boolean): void {
    this.ready = ready
    this.applyDotColor()
  }

  /** The persistent count line, e.g. "3 messages". */
  setHeader(line: string): void {
    this.headerLine = line
    if (this.headerText) this.headerText.text = line
  }

  /** Before "start": the summary plus the Start button. */
  showIdle(snippet: string): void {
    this.pane = {kind: "idle", snippet: snippet}
    this.requestRender()
  }

  /** Ready and resting: the summary plus the "Who wrote" button. */
  showCompact(snippet: string): void {
    this.pane = {kind: "compact", snippet: snippet}
    this.requestRender()
  }

  /** After "who wrote": one big row per sender. */
  showSenderList(senders: string[]): void {
    this.pane = {kind: "senders", senders: senders.slice()}
    this.requestRender()
  }

  /** An opened message: sender plus the full text. */
  showMessage(sender: string, text: string): void {
    this.pane = {kind: "message", sender: sender, text: text}
    this.requestRender()
  }

  /**
   * The cleaned-up reply draft. `said` is the gist the user spoke, shown dim
   * above the draft so the rewrite is visible as a rewrite.
   */
  showDraft(sender: string, said: string, draft: string): void {
    this.pane = {kind: "draft", sender: sender, said: said, draft: draft}
    this.requestRender()
  }

  /** The sent confirmation. Main decides how long it stays. */
  showSent(draft: string): void {
    this.pane = {kind: "sent", draft: draft}
    this.requestRender()
  }

  // ═══ Structure built once in onAwake ══════════════════════════════════════

  private build(): void {
    // Canvas defaults to SortingType.Hierarchy - the depth-first hierarchy walk
    // IS the render order here, so nothing in this subtree sets renderOrder.
    this.sceneObject.createComponent("Component.Canvas")

    // Plate first so the hierarchy DFS paints it behind the content.
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(this.cardWidthCm, this.cardHeightCm)

    const innerW = this.cardWidthCm - PAD * 2

    // Content after the plate, lifted forward off its front face.
    const content = this.obj(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const col = this.makeFlex(content, FlexDirection.Column, this.cardWidthCm, this.cardHeightCm, {
      gap: ROOT_GAP,
      padX: PAD,
      padY: PAD,
      align: FlexAlign.Stretch,
      justify: FlexJustify.Start,
    })

    // ── Status row: the dot in the card's top-left, plus the count line ──────
    const statusRow = this.obj(content, "StatusRow")
    this.liftInZ(statusRow, LAYOUT_Z_LIFT)
    const statusFlex = this.configureFlex(
      statusRow, FlexDirection.Row, innerW, STATUS_H,
      {gap: 0.8, align: FlexAlign.Center, justify: FlexJustify.Start}
    )
    const statusItem = statusRow.createComponent(FlexItem.getTypeName()) as FlexItem
    statusItem.alignSelf = FlexAlignSelf.Stretch
    statusItem.overrideHeight = STATUS_H

    const dotObj = this.obj(statusRow, "StatusDot")
    const dot = dotObj.createComponent("Component.Image") as Image
    dot.mainMaterial = imageMaterial.clone()
    dot.mainPass.baseTex = ICON_DOT
    dot.mainPass.depthTest = true
    dot.mainPass.depthWrite = false
    dot.stretchMode = StretchMode.Stretch
    dotObj.getTransform().setLocalScale(new vec3(2, 2, 1))
    const dotItem = dotObj.createComponent(FlexItem.getTypeName()) as FlexItem
    dotItem.overrideWidth = 2
    dotItem.overrideHeight = 2
    this.dotImage = dot

    const headerW = innerW - 2 - 0.8
    const headerObj = this.obj(statusRow, "HeaderText")
    const header = headerObj.createComponent("Component.Text") as Text
    header.text = this.headerLine
    header.depthTest = true
    applyTextRole(header, "Headline2")
    header.textFill.color = TEXT_PRIMARY
    header.horizontalAlignment = HorizontalAlignment.Left
    header.verticalAlignment = VerticalAlignment.Center
    header.horizontalOverflow = HorizontalOverflow.Overflow
    header.verticalOverflow = VerticalOverflow.Overflow
    header.layoutRect = Rect.create(-headerW / 2, headerW / 2, -HEADER_H / 2, HEADER_H / 2)
    const headerItem = headerObj.createComponent(FlexItem.getTypeName()) as FlexItem
    headerItem.overrideWidth = headerW
    headerItem.overrideHeight = HEADER_H
    this.headerText = header

    statusFlex.addItems([dotItem, headerItem])

    // ── Pane host: the part of the card that changes with state ─────────────
    const paneH = this.cardHeightCm - PAD * 2 - STATUS_H - ROOT_GAP
    const paneHost = this.obj(content, "PaneHost")
    this.liftInZ(paneHost, LAYOUT_Z_LIFT)
    const paneFlex = this.configureFlex(
      paneHost, FlexDirection.Column, innerW, paneH,
      {gap: PANE_GAP, align: FlexAlign.Stretch, justify: FlexJustify.Start}
    )
    const paneItem = paneHost.createComponent(FlexItem.getTypeName()) as FlexItem
    paneItem.alignSelf = FlexAlignSelf.Stretch
    paneItem.overrideHeight = paneH

    col.addItems([statusItem, paneItem])

    this.paneHost = paneHost
    this.paneFlex = paneFlex
  }

  private applyDotColor(): void {
    if (!this.dotImage) return
    this.dotImage.mainPass.baseColor = this.ready ? this.readyDotColor : this.idleDotColor
  }

  // ═══ Pane rendering ═══════════════════════════════════════════════════════

  /**
   * Rebuilds the changing half of the card. FlexLayout only re-discovers its
   * children when the child *count* changes - toggling `enabled` would leave
   * stale positions - so every state change unregisters and destroys the old
   * rows, then builds and registers new ones.
   */
  /**
   * The height the changing half of the card has to work with. Row heights are
   * derived from this rather than hard-coded, so the button row always lands on
   * the card's lower edge (the brief asks for that) whatever the card height
   * @input is set to, and the text rows absorb the slack instead of leaving the
   * buttons floating mid-card.
   */
  private paneHeightCm(): number {
    return this.cardHeightCm - PAD * 2 - STATUS_H - ROOT_GAP
  }

  private renderPane(): void {
    const host = this.paneHost
    const flex = this.paneFlex
    if (!host || !flex) return

    if (this.paneItems.length > 0) {
      flex.removeItems(this.paneItems)
      this.paneItems = []
    }
    const stale = host.children
    for (let i = stale.length - 1; i >= 0; i--) {
      stale[i].destroy()
    }

    const innerW = this.cardWidthCm - PAD * 2
    const paneH = this.paneHeightCm()
    const btnH = this.buttonHeightCm
    const items: FlexItem[] = []
    const p = this.pane

    if (p.kind === "idle" || p.kind === "compact") {
      // One text row taking everything that is not the button row: the snippet
      // sits centred in the card's upper half, the button on its lower edge.
      const snippetH = paneH - btnH - PANE_GAP
      items.push(this.addTextRow(host, p.snippet, "Body", snippetH, innerW, TEXT_SECONDARY, true))
      if (p.kind === "idle") {
        items.push(this.addButtonRow(host, innerW, [
          {label: "Start", icon: ICON_START, action: () => this._onStart.invoke()},
        ]))
      } else {
        items.push(this.addButtonRow(host, innerW, [
          {label: "Who wrote", icon: ICON_WHO, action: () => this._onWhoWrote.invoke()},
        ]))
      }
    } else if (p.kind === "senders") {
      const n = p.senders.length
      const share = (paneH - PANE_GAP * (n - 1)) / n
      const rowH = Math.min(Math.max(share, btnH), SENDER_ROW_MAX)
      for (let i = 0; i < n; i++) {
        const index = i
        items.push(this.addSenderRow(host, p.senders[i], innerW, rowH, () =>
          this._onSenderSelected.invoke(index)
        ))
      }
    } else if (p.kind === "message") {
      const senderH = 2.8
      const textH = paneH - senderH - btnH - PANE_GAP * 2
      items.push(this.addTextRow(host, p.sender, "Headline2", senderH, innerW, TEXT_PRIMARY, false))
      items.push(this.addTextRow(host, p.text, "Body", textH, innerW, TEXT_SECONDARY, true))
      items.push(this.addButtonRow(host, innerW, [
        {label: "Speak", icon: ICON_SPEAK, action: () => this._onSpeak.invoke()},
        {label: "Remove", icon: ICON_REMOVE, action: () => this._onRemove.invoke()},
      ]))
    } else if (p.kind === "draft") {
      // The gist and the rewrite are the same size; the rewrite is the bolder
      // Callout in mint, the gist the lighter Body. Dimming the gist is what
      // the old card did and it is exactly what does not survive an additive
      // display, so the difference is weight and hue only.
      const senderH = 2.6
      const saidH = 3.2
      const draftH = paneH - senderH - saidH - btnH - PANE_GAP * 3
      items.push(this.addTextRow(host, p.sender, "Headline2", senderH, innerW, TEXT_PRIMARY, false))
      items.push(this.addTextRow(host, p.said, "Body", saidH, innerW, TEXT_SECONDARY, true))
      items.push(this.addTextRow(host, p.draft, "Callout", draftH, innerW, TEXT_DRAFT, true))
      items.push(this.addButtonRow(host, innerW, [
        {label: "Send", icon: ICON_SEND, action: () => this._onSend.invoke()},
        {label: "Remove", icon: ICON_REMOVE, action: () => this._onRemove.invoke()},
      ]))
    } else {
      const sentH = 4.6
      items.push(this.addTextRow(host, this.sentLabel, "Headline1", sentH, innerW, TEXT_DRAFT, false))
      items.push(
        this.addTextRow(host, p.draft, "Body", paneH - sentH - PANE_GAP, innerW, TEXT_SECONDARY, true)
      )
    }

    flex.addItems(items)
    this.paneItems = items
  }

  /** One text row in the pane column. `wrap` for anything longer than a line. */
  private addTextRow(
    parent: SceneObject,
    value: string,
    role: TextRole,
    heightCm: number,
    widthCm: number,
    color: vec4,
    wrap: boolean
  ): FlexItem {
    const so = this.obj(parent, "Row")
    this.liftInZ(so, LAYOUT_Z_LIFT)
    const t = so.createComponent("Component.Text") as Text
    t.text = value
    t.depthTest = true
    applyTextRole(t, role)
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Left
    // Never Top for a wrapping row: Top plants line 1 at the rect's top edge and
    // spills extra lines UPWARD into the row above. Center splits any overflow.
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-widthCm / 2, widthCm / 2, -heightCm / 2, heightCm / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.alignSelf = FlexAlignSelf.Stretch
    item.overrideHeight = heightCm
    return item
  }

  /**
   * A full-width sender row - a big target that opens that person's message.
   * `heightCm` is shared out by the caller from the pane's spare height, so the
   * rows grow past the 4 cm floor rather than leaving dead space under them.
   */
  private addSenderRow(
    parent: SceneObject,
    sender: string,
    widthCm: number,
    heightCm: number,
    action: () => void
  ): FlexItem {
    const so = this.obj(parent, "Sender-" + sender)
    this.liftInZ(so, LAYOUT_Z_LIFT)
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(widthCm, heightCm, 1)
    const ec = so.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.text = sender
    ec.textSize = roleSize("Headline2")
    ec.contentAlignment = "center"
    this.whitenLabel(ec)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = widthCm
    item.overrideHeight = heightCm
    item.alignSelf = FlexAlignSelf.Stretch
    btn.onTriggerUp.add(() => action())
    return item
  }

  /**
   * Takes a UI Kit label to pure white.
   *
   * ElementContent resolves its text colour from the active theme, which paints
   * it at 0.85 grey - fine on a backlit screen, a visible step down from the
   * card's own white text on an additive display. The two fields behind the
   * override are Inspector @inputs with no public setter, so they are written
   * directly and then committed through the public markColorsDirty(), which
   * exists for exactly this (re-resolve after a per-instance colour change).
   */
  private whitenLabel(ec: ElementContent): void {
    const fields = ec as unknown as {
      _useTextColorOverride: boolean
      _textColorOverride: vec4
    }
    fields._useTextColorOverride = true
    fields._textColorOverride = TEXT_CONTROL
    ec.markColorsDirty()
  }

  /** The action row along the card's lower edge, inside the card. */
  private addButtonRow(
    parent: SceneObject,
    widthCm: number,
    buttons: {label: string; icon: Texture; action: () => void}[]
  ): FlexItem {
    const row = this.obj(parent, "ButtonRow")
    this.liftInZ(row, LAYOUT_Z_LIFT)
    const flex = this.configureFlex(
      row, FlexDirection.Row, widthCm, this.buttonHeightCm,
      {gap: 0.8, align: FlexAlign.Center, justify: FlexJustify.Center}
    )
    const rowItem = row.createComponent(FlexItem.getTypeName()) as FlexItem
    rowItem.alignSelf = FlexAlignSelf.Stretch
    rowItem.overrideHeight = this.buttonHeightCm

    // Buttons fill the row. A lone button was briefly narrowed to 12 cm to pull
    // its icon closer to its label, and the IK reach test immediately started
    // missing it: a full-width target converges every time, a 12 cm one does
    // not. Easy to hit beats tidy, so the icon keeps its left-edge position.
    const gaps = 0.8 * (buttons.length - 1)
    const btnW = (widthCm - gaps) / buttons.length

    const children: FlexItem[] = []
    for (const spec of buttons) {
      children.push(this.addActionButton(row, spec.label, spec.icon, btnW, spec.action))
    }
    flex.addItems(children)
    return rowItem
  }

  private addActionButton(
    parent: SceneObject,
    label: string,
    icon: Texture,
    widthCm: number,
    action: () => void
  ): FlexItem {
    const so = this.obj(parent, "Btn-" + label)
    this.liftInZ(so, BUTTON_LABEL_Z)
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(widthCm, this.buttonHeightCm, 1)
    const ec = so.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.leadingIcon = icon
    ec.leadingIconSize = CONTROL_ICON_CM
    ec.text = label
    ec.textSize = roleSize("Button")
    ec.contentAlignment = "center"
    ec.spacing = 0.5
    this.whitenLabel(ec)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = widthCm
    item.overrideHeight = this.buttonHeightCm
    btn.onTriggerUp.add(() => action())
    return item
  }

  // ═══ Small helpers ════════════════════════════════════════════════════════

  /** Creates a child SceneObject carrying a configured FlexLayout. */
  private makeFlex(
    host: SceneObject,
    direction: FlexDirection,
    width: number,
    height: number,
    opts: {gap?: number; padX?: number; padY?: number; align?: FlexAlign; justify?: FlexJustify}
  ): FlexLayout {
    return this.configureFlex(host, direction, width, height, opts)
  }

  /**
   * Puts a FlexLayout on `host` with explicit item registration.
   *
   * `autoDiscoverItemsOnStart` is turned OFF on purpose: with it on, UIKit
   * throws from addItems() until the layout's own OnStartEvent has run, and
   * this card builds its rows inside onAwake and rebuilds them on every state
   * change. Off, addItems() is legal at any time and is the only registration
   * path - which is what we want anyway, since auto-discovery never sees rows
   * created after the first layout pass.
   */
  private configureFlex(
    host: SceneObject,
    direction: FlexDirection,
    width: number,
    height: number,
    opts: {gap?: number; padX?: number; padY?: number; align?: FlexAlign; justify?: FlexJustify}
  ): FlexLayout {
    const flex = host.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.onInitialized.add(() => {
      flex.width = width
      flex.height = height
      flex.direction = direction
      if (direction === FlexDirection.Row) {
        flex.columnGap = opts.gap ?? 0
      } else {
        flex.rowGap = opts.gap ?? 0
      }
      flex.paddingTop = opts.padY ?? 0
      flex.paddingBottom = opts.padY ?? 0
      flex.paddingLeft = opts.padX ?? 0
      flex.paddingRight = opts.padX ?? 0
      flex.justifyContent = opts.justify ?? FlexJustify.Start
      flex.alignItems = opts.align ?? FlexAlign.Stretch
      // verticalAlignment stays at its default (Center). `Top` means "top edge
      // AT the host origin", which pours a fixed-height container's content out
      // of the bottom of the card; every container here has a fixed height that
      // matches its content, so centring on the origin is what lands it inside.
      flex.markDirty()
    })
    return flex
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    if (position) so.getTransform().setLocalPosition(position)
    return so
  }

  private liftInZ(so: SceneObject, zOffset: number): void {
    const transform = so.getTransform()
    const p = transform.getLocalPosition()
    transform.setLocalPosition(new vec3(p.x, p.y, p.z + zOffset))
  }
}
