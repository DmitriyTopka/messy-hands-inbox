# Messy Hands Inbox

A Spectacles Lens for the moment your hands are busy.

You're cooking. Your hands are in dough or minced meat, and three people text you at once. You can't touch your phone. Messy Hands Inbox puts one small card on the counter, just right of your work, so it never covers what you're doing. You glance at it, pick whose message to read, say the gist of your reply in your own words, see the cleaned-up text, and send it.

Built for [Learn AR with SPECS](https://learn-specs.devpost.com/) in Lens Studio 5.24, shown in the Lens Studio preview (no Spectacles device was used).

Demo video: see the Devpost page.

## What it does

- A grey status dot turns green when you say "start".
- The card shows how many messages are waiting, plus the newest sender and the start of the text.
- "Who wrote?" lists the senders. Pick one to read the message.
- Say the gist of your answer. The Lens shows a clean reply before anything goes.
- "Send" shows a sent state. "Remove" clears the message and the count drops.
- Every voice command has a big pinch button, so it works with dirty hands and in the preview.

The demo uses stand-ins on purpose: three hard-coded messages, a hard-coded gist and rewrite per message, a virtual counter and a dough ball. Nothing is really sent. See `SpecsLens/devpost/design-brief.md` for why.

## How it was made

1. **Plan.** The `plan-lens` interview turned the idea into a design brief: the one spatial moment, where each thing sits in centimetres, how you act on it with your hands, and five done criteria. Brief: [`SpecsLens/devpost/design-brief.md`](SpecsLens/devpost/design-brief.md).
2. **Build.** Snap's CLAD agents (the `ls-clad` plugin for Claude Code, connected to Lens Studio over MCP) built the Lens from the brief.
3. **Test.** LEAF scenarios check each done criterion in the preview. Result: 6 of 6 pass (five done criteria plus a reach test for a standing user).
4. **Fix with design notes.** After the first build the card text was too small and too pale for an additive display. One design note ("larger, near-white, readable at 55 cm") fixed it; tests re-run green.

Build details, measurements and the bugs found along the way: [`SpecsLens/devpost/build-notes.md`](SpecsLens/devpost/build-notes.md). Preview walkthrough screenshots: `SpecsLens/devpost/walkthrough/`.

## Run it

1. Install Lens Studio 5.24 or newer.
2. Open `SpecsLens/SpecsLens.esproj`.
3. In the Preview panel choose Interactive Preview. Click acts as a pinch; WASD moves, right-drag looks around.

## Known limits

- Voice commands are wired but switched off (`VoiceCommands.enableVoice`): speech recognition in the preview needs a signed-in Snap account. The buttons do the same job.
- The reply rewrite is hard-coded. A real version would call an AI model and real messengers.
- Comfort, real hand tracking and readability on actual glasses are not proven; only the preview was available.

## Repo layout

- `SpecsLens/` - the Lens Studio project, with `devpost/` (brief, build notes, walkthrough)
- `video/` - the demo video, its voice-over lines and title cards
