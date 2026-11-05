## What it is
Messy Hands Inbox is a hands-busy inbox for Spectacles, not a recipe app. It is for the moment your hands are in dough, at a workbench or at a changing table and people keep texting. One small card lies on the counter next to your work. You see who wrote, give the gist of your answer, check the clean reply and send it without touching your phone.

## Evidence at a glance
- **23 LEAF scenarios, three full runs in a row, 69 of 69 passed** (05.11, Lens Studio 5.24.1 preview). Raw per-scenario output with timestamps: `devpost/leaf_runs_0611.txt`.
- **Memory between sessions.** Restart the Lens and the card says "Last time: 1 replied, 1 cleared". Checked with a real preview restart, not only a test.
- **Built by CLAD over the Lens Studio MCP server** from a plan-lens brief. The video's build section replays the real session log next to the screenshots the agent took itself.
- **Every number below is measured by the tests**, not copied from the brief.

## Inspiration
When I cook, my hands are in dough or minced meat, and that is exactly when several people write to me at once. I can't touch the phone. The answers still need to say what I mean.

## What it does
The card lies on a wooden counter just right of the dough. A grey dot turns green on Start. "Who wrote?" lists the senders, I pick one and read the message. Speak opens the draft: the gist in my words and the clean reply under it, before anything goes. Send shows it sent. Remove clears the message and the count drops. Next time I open the Lens it remembers what I answered and what I cleared.

Voice commands exist in the code, but in this preview every action is a big pinch button (see "What is not proven").

## How I built it
The plan-lens interview turned my answers into `devpost/design-brief.md`: card on the counter right of the dough, targets at least 4 cm, light text, five done criteria. CLAD (Snap's `ls-clad` plugin for Claude Code) then built the Lens through the MCP server. It wrote the TypeScript, placed everything in centimetres, used the Spectacles Interaction Kit and UI Kit, and wrote a LEAF scenario per criterion.

In round one I gave one design note after standing in the preview: the text was too small and too pale at 55 cm. CLAD found the cause (text scaled for a panel near the face, and 0.7 alpha on an additive display) and fixed both.

In round two (05.11) CLAD added the memory, textured the counter and the dough, and grew the suite from 6 to 23 scenarios. It also caught a mistake in round one, described below.

## Tests: 23 LEAF scenarios
| Group | What the scenarios prove |
|---|---|
| Done criteria (5) | dot states, card placement, who wrote, reply and send, remove |
| Flow edge cases (8) | empty inbox, Start twice, Remove with a draft open, "Sent" timing out, every command refused outside its phase, reset twice, long text truncated, inbox logic without a scene |
| Memory (4) | reply and removal reach real storage, reset wipes it, store round trip, removed stays gone while replied comes back marked |
| Design and reach (5) | text size and colour in all 7 card states, every target at least 4 cm, the card never covers the dough, reach standing and seated |
| Demo tour (1) | the whole walkthrough in one pass, used to film the video |

Measured by the suite: smallest glyph 1.29 cm at 83.4 cm from the eye; smallest target 9.4 x 4.4 cm; the furthest sender row is 53.3 cm from a seated shoulder, within a 62 cm arm.

## A correction the tests made
Round one said the card and the dough fit in view together. The occlusion test proved that wrong. The dough takes 24.8 degrees, the card 28.0 and the display is 32.3 wide. You glance between them, the way you glance at a recipe card. What holds: the card never covers the work from any head angle (1.8 degree gap). I kept the layout and wrote this down instead of hiding it.

## What is proven and what is not
I had no Spectacles. Everything ran in the Lens Studio preview.
- Proven in the preview: the whole flow, placement, target sizes, reach, memory across restarts.
- Not proven: comfort of the glance while kneading, real hand tracking, and whether a real AI rewrite keeps my meaning. The three messages and their rewrites are sample data.
- Voice is wired but off. Speech in the preview needs a Snap sign-in, and in Lens Studio 5.24.1 the sign-in opens the SPECS account page that other entrants also cannot get past (forum thread "Lens Studio 5.24.1: CLAD blocked by SPECS developer sign-in"). The pinch buttons do the same job.

## How to run it
1. Install Lens Studio 5.24 and clone https://github.com/DmitriyTopka/messy-hands-inbox
2. Open `SpecsLens/SpecsLens.esproj`, choose Interactive Preview. A click is a pinch.
3. Press Start, Who wrote, Mom, Speak, Send, then Remove on another message. Refresh the preview to see the memory line.
4. Tests: open the LEAF panel and run any scenario, or `demo-tour` for the full pass.

## Challenges
The narrow field of view. "To the side" in my head meant out of view on the glasses, so the card moved onto the counter. Text that looked fine on a laptop failed at 55 cm. Recording was harder than building: the preview's Record Video button records while the agent presses the buttons through MCP.

## What's next
Real messengers and a real AI rewrite behind the same card, voice turned on once sign-in works, and a test on real Spectacles for comfort.
