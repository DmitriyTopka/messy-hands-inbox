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
// `Component.Text.size` is the glyph em-square height (em cm = size / 43.886),
// calibrated for the SnapOS system font at the z = -110 cm focal plane. This
// card sits ~85 cm from the eye, so every role is applied at that distance and
// the scale shrinks each size by 85/110 - same visual angle, smaller card.
const FONT_SIZE_SCALE = 1.0

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

/** The card's own focal distance - all text is sized for this, not for 110 cm. */
const CARD_DISTANCE_CM = 85

function roleSize(role: TextRole, distanceCm: number = CARD_DISTANCE_CM): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}

function applyTextRole(t: Text, role: TextRole, distanceCm: number = CARD_DISTANCE_CM): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

// Depth-buffer tie-breakers (not render order - the Canvas hierarchy DFS owns that).
const CONTENT_Z = 0.6       // content child, forward of the plate's front face
const BUTTON_LABEL_Z = 0.08 // content drawn ON a button face
const LAYOUT_Z_LIFT = 0.02

const TEXT_PRIMARY = new vec4(1, 1, 1, 1)
const TEXT_SECONDARY = new vec4(1, 1, 1, 0.7)
const TEXT_DRAFT = new vec4(0.6, 0.92, 0.72, 1)

/**
 * How long the card waits before swapping panes. A state change is always
 * raised from a button's own trigger callback, and the swap destroys that
 * button; tearing it down while SIK is still unwinding the pinch kills the
 * input event ("Object is null"). This is long enough for the interaction to
 * finish against a live object, short enough to read as instant.
 */
const REBUILD_DELAY_S = 0.12

const PAD = 1.2
const STATUS_H = 2.6
const ROOT_GAP = 0.7
const PANE_GAP = 0.5

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
  @hint("Card height in cm. 20 cm fits three 4 cm sender rows plus the status line.")
  cardHeightCm: number = 20

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
    applyTextRole(header, "Subheadline")
    header.textFill.color = TEXT_PRIMARY
    header.horizontalAlignment = HorizontalAlignment.Left
    header.verticalAlignment = VerticalAlignment.Center
    header.horizontalOverflow = HorizontalOverflow.Overflow
    header.verticalOverflow = VerticalOverflow.Overflow
    header.layoutRect = Rect.create(-headerW / 2, headerW / 2, -1.2, 1.2)
    const headerItem = headerObj.createComponent(FlexItem.getTypeName()) as FlexItem
    headerItem.overrideWidth = headerW
    headerItem.overrideHeight = 2.2
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
    const items: FlexItem[] = []
    const p = this.pane

    if (p.kind === "idle" || p.kind === "compact") {
      items.push(this.addTextRow(host, p.snippet, "Caption", 5.0, innerW, TEXT_SECONDARY, true))
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
      for (let i = 0; i < p.senders.length; i++) {
        const index = i
        items.push(this.addSenderRow(host, p.senders[i], innerW, () =>
          this._onSenderSelected.invoke(index)
        ))
      }
    } else if (p.kind === "message") {
      items.push(this.addTextRow(host, p.sender, "Subheadline", 2.0, innerW, TEXT_PRIMARY, false))
      items.push(this.addTextRow(host, p.text, "Caption", 5.5, innerW, TEXT_SECONDARY, true))
      items.push(this.addButtonRow(host, innerW, [
        {label: "Speak", icon: ICON_SPEAK, action: () => this._onSpeak.invoke()},
        {label: "Remove", icon: ICON_REMOVE, action: () => this._onRemove.invoke()},
      ]))
    } else if (p.kind === "draft") {
      items.push(this.addTextRow(host, p.sender, "Subheadline", 1.8, innerW, TEXT_PRIMARY, false))
      items.push(this.addTextRow(host, p.said, "Caption", 2.6, innerW, TEXT_SECONDARY, true))
      items.push(this.addTextRow(host, p.draft, "Body", 4.0, innerW, TEXT_DRAFT, true))
      items.push(this.addButtonRow(host, innerW, [
        {label: "Send", icon: ICON_SEND, action: () => this._onSend.invoke()},
        {label: "Remove", icon: ICON_REMOVE, action: () => this._onRemove.invoke()},
      ]))
    } else {
      items.push(this.addTextRow(host, this.sentLabel, "Headline1", 3.0, innerW, TEXT_DRAFT, false))
      items.push(this.addTextRow(host, p.draft, "Caption", 4.0, innerW, TEXT_SECONDARY, true))
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

  /** A full-width sender row - a big target that opens that person's message. */
  private addSenderRow(
    parent: SceneObject,
    sender: string,
    widthCm: number,
    action: () => void
  ): FlexItem {
    const so = this.obj(parent, "Sender-" + sender)
    this.liftInZ(so, LAYOUT_Z_LIFT)
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(widthCm, this.buttonHeightCm, 1)
    const ec = so.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.text = sender
    ec.textSize = roleSize("Callout")
    ec.contentAlignment = "center"
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = widthCm
    item.overrideHeight = this.buttonHeightCm
    item.alignSelf = FlexAlignSelf.Stretch
    btn.onTriggerUp.add(() => action())
    return item
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
    ec.text = label
    ec.textSize = roleSize("Button")
    ec.contentAlignment = "center"
    ec.spacing = 0.5
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
