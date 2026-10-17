# Devpost submission draft: Messy Hands Inbox

**Tagline:** Hands in dough, three people texting: glance, speak, keep cooking.

**Video:** https://youtu.be/zjj550QKkAc
**Repo:** https://github.com/DmitriyTopka/messy-hands-inbox
**Built with:** Lens Studio, Spectacles Interaction Kit, Spectacles UI Kit, CLAD, LEAF, Claude Code, TypeScript

## Inspiration
When I cook, my hands are in dough or minced meat, and that is exactly when several people write to me at once. I can't touch the phone, but the answers still need to carry what I actually mean.

## What it does
One small card lies on the counter, just right of the dough, so it never covers the work. A grey dot turns green on "start". "Who wrote?" lists the senders, I pick one, say the gist of my reply in my own words, see a cleaned-up version, and send it. "Remove" clears the message and the count drops. Every voice command has a big pinch button, so it works with dirty hands and in the preview.

## Who it's for
People whose hands are busy and dirty while messages pile up: home cooks kneading dough or shaping cutlets, parents with flour on their fingers and the family chat going off. I built it for myself first. I cook, and that's when my phone fills up.

## How it differs from AR recipe apps
Recipe Lenses put a timer or the next step over the pan. This one leaves the cooking to you and handles the conversation around it. You answer in your own words, you read the clean version before it goes, and nothing leaves until you say "send".

## How I built it
I answered the plan-lens interview, which turned the idea into a design brief: the one spatial moment, where each element sits in centimetres, how I act on it, and five done criteria. Snap's CLAD agents built the Lens in Lens Studio from that brief over MCP and wrote LEAF scenarios for every criterion. After the first build I gave one design note (larger, near-white text for an additive display) and the tests ran green again: 6 of 6.

## Challenges
The narrow field of view: a card placed "to the side" falls out of view, so it sits on the counter next to the work instead. Text that looked fine on a laptop was too small and pale for a glance from 55 cm. Speech recognition in the preview needs a signed-in Snap account, so the demo uses the pinch buttons.

## What I learned
Designing for glasses is mostly about where and when, not what. Specific answers (centimetres, which side, what shows when) made the agent's build match what I pictured.

## What's next
Real messengers and a real AI rewrite behind the same card, voice turned on, and a test on real Spectacles for comfort and readability.
