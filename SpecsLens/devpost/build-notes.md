# Messy Hands Inbox - build notes

Built from `devpost/design-brief.md` for SPECS, runnable in the Lens Studio preview.
Target: Spectacles. SIK 2.0.0 + Spectacles UI Kit 2.0.0 + Leaf 2.0.2.

## What runs

Three hard-coded messages (Mom, Alex, Work chat) are waiting the moment the Lens
starts, announced by a short chime. A card lying on a virtual kitchen counter,
just right of the dough, shows the count. Pinch Start and the status dot turns
green. Pinch "Who wrote" for the three sender names, pinch a name to read that
message, pinch Speak to see the spoken gist rewritten into a clean reply, then
Send (shows a sent state only, nothing leaves the Lens) or Remove.

Every command exists as both a pinch button and a spoken phrase. The buttons are
the proven path; see "Voice" below.

## Scene

Real-world centimetres, user's eyes at the origin looking down the -Z axis.

```
MessyHandsInbox                 (0, 0, 0)          MessyHandsMain.ts
├── CounterStandIn              (0, -70, -55)      the whole stand-in, moves as one
│   ├── CounterTop              120 x 4 x 60 cm    top surface at y = -70 (90 cm counter, ~160 cm eye height)
│   ├── CounterBody             110 x 86 x 52 cm
│   └── DoughBall               20 cm sphere, resting on the surface at 55 cm in front
├── MessageCard                 (26, -61.5, -50), pitched -50 degrees   MessyHandsCardUI.ts
├── ChimeAudio                                      MessyHandsAudioController.ts
└── VoiceCommands                                   MessyHandsVoiceController.ts
LeafIndex                                           the test suite
```

Measured, not assumed: `GetBoundingBox` reports the dough at 19.9 x 20.0 x 19.8 cm
spanning y -70 to -50, i.e. sitting exactly on the counter top.

### Three places the brief's defaults were changed, and why

1. **Card 22 x 20 cm, not 22 x 14 cm.** The brief also requires every target to
   be at least 4 cm tall. Three sender rows at 4.4 cm plus the status line and a
   button row do not fit in 14 cm. Both dimensions are `@input`s.
2. **Card 26 cm right of the dough, not 30 cm.** At 85 cm the display is about
   41 cm wide, so a 20 cm dough plus a 22 cm card cannot both sit inside it at
   30 cm separation - the card's right edge was clipped, which breaks the brief's
   own "the card is placed so it stays in view". 26 cm keeps the whole card and
   the dough visible together, with 5 cm of clearance between them.
3. **Counter centred under the dough at 55 cm.** The brief says the counter is
   "about 45 cm in front" and the dough "about 55 cm in front" at the counter's
   centre; with a 60 cm deep counter those cannot both hold. The gaze target won:
   the dough is at 55 cm, which puts the counter's near edge ~25 cm away, where
   you actually stand to knead.

## LEAF results

Six scenarios in `Assets/Scenarios/`, run in the Lens Studio preview. **All six pass.**

| Scenario | Done criterion | Result |
|---|---|---|
| `criterion-1-status-dot` | 1 - grey dot at start, green after Start | PASS |
| `criterion-2-card-placement` | 2 - card right of and below the dough, reads "3 messages", does not cover it | PASS |
| `criterion-3-who-wrote` | 3 - three sender names, pinching one opens that message | PASS |
| `criterion-4-reply-and-send` | 4 - Speak shows the cleaned-up draft, Send shows it sent | PASS |
| `criterion-5-remove` | 5 - Remove drops the message, card reads "2 messages" | PASS |
| `reach-standing-user` | (not a criterion) IK reachability for a standing user | PASS |

`reach-standing-user` asserts only what reproduces: a standing user's arm
converges on Start and on "Who wrote". It deliberately does not assert the
sender rows - see the open item below.

Every criterion in the brief has a test. No criterion is untested.

The tests assert against live state, not against the numbers used to build the
scene: criterion 2 reads the dough's runtime AABB and transforms the card's own
corners into world space; criterion 1 reads the dot's material colour and
compares it to the card's configured colours; criterion 4 checks the draft is the
rewritten reply and not an echo of the gist.

Each scenario calls `resetDemo()` first, so they do not inherit each other's state.

To re-run: open the LEAF panel, pick a scenario, Run. Or drive all six through
the LEAF MCP tools.

## What is proven, and what is not

**Logic proven** (tests and preview show it working):
- The whole flow: start, list senders, open, reply, send, remove.
- The card's placement relative to the dough and the counter.
- The status dot's two states.
- Targets are at least 4.4 cm and highlight on hover (UI Kit buttons).
- A standing user's arm can reach Start and "Who wrote" (IK).

**Feel unproven** (only real glasses can tell):
- Whether glancing down-right while kneading is comfortable over a session.
- Real hand tracking against these targets, especially the sender rows.
- Whether the rewritten reply keeps the user's meaning - the demo only shows
  hard-coded pairs, so this is asserted, not demonstrated.

## Known limitations

**External - acceptable to ship:**
- **Voice is off by default.** `VoiceCommands.enableVoice` is wired and
  implemented (start / who wrote / sender name / speak / send / remove), but the
  preview's VoiceML token fetch returns 401 with "Login to My Lenses is required"
  and retries twice a second, flooding the log. Switched off so the demo stays
  clean. Turn it on in the Inspector when signed in or on device. Snap's own ASR
  guidance also warns that keyword spotting is unreliable, which is exactly why
  every spoken command has a button.
- Lens Studio was not signed in during this build, so the AI mesh backends and
  publishing were unavailable. Not needed: the counter and dough are primitives
  at real scale, which is what the brief specifies as the stand-in.

**Self-caused - one open item:**
- **A physical reach lands on the sender-list rows only intermittently.**
  Measured across repeated runs, not guessed: the IK arm converges on Start and
  "Who wrote" every time; on the sender rows the top row never converges and the
  bottom row converges only sometimes. Three stacked 4.4 cm rows on a card
  pitched 50 degrees at 85 cm are at the edge of what a physical reach handles.
  The scripted interactor triggers every row correctly, so the controls work -
  this is about where they sit and how a hand gets to them, and it is the first
  thing to check on real hardware. If it reproduces there, the fix is fewer or
  taller rows, or a flatter card pitch.

  Two things that came out of chasing this, both kept:
  - Narrowing a lone button from full width to 12 cm (to tuck its icon nearer
    its label) made the IK reach miss it reliably. Reverted: easy to hit beats
    tidy. Buttons fill their row.
  - Yawing the card 25 degrees toward the user, to face it along the gaze, made
    it read as skewed in view because of Euler order, without fixing the reach.
    Reverted to a pure 50-degree pitch.

## Three bugs worth remembering

1. **Cross-script access in `onAwake`.** `MessyHandsMain` sits above the card in
   the hierarchy, so it wakes first; reading the card's event getters there
   returned undefined. Subscriptions moved to `OnStartEvent`.
2. **`verticalAlignment = Top` on a fixed-height FlexLayout.** "Top" means the
   content's top edge sits AT the host origin, which poured the card's rows out
   of its bottom. The default (Center) is correct for a container whose height
   matches its content.
3. **Destroying a button inside its own trigger callback.** Every state change is
   raised from a button that the rebuild then destroys; tearing it down while SIK
   was still unwinding the pinch killed the input event. The card now waits
   `REBUILD_DELAY_S` (0.12 s) before swapping panes. This was a real fragility,
   not just a test artefact.

## Files

| File | What it owns |
|---|---|
| `Assets/Scripts/MessyHandsMain.ts` | phase, and the command each button or spoken word maps to |
| `Assets/Scripts/MessyHandsCardUI.ts` | the card surface and every pane it can show (UI Kit only) |
| `Assets/Scripts/MessyHandsInbox.ts` | which messages exist and which is open (pure logic) |
| `Assets/Scripts/MessyHandsSampleMessages.ts` | the hard-coded stand-in inbox |
| `Assets/Scripts/MessyHandsAudioController.ts` | the arrival chime |
| `Assets/Scripts/MessyHandsVoiceController.ts` | optional spoken commands |
| `Assets/Scenarios/*.ts` | the LEAF suite |
| `Assets/GeneratedSFX/MessageChime.wav` | 0.9 s two-note chime, generated locally |
| `Assets/Icons/*.png` | play_arrow, group, mic, send, delete, circle |
