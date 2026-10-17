---
status: approved
---

# Design brief: Messy Hands Inbox (working name, default)

## The one spatial moment
I'm standing in my kitchen, my hands are in dough or minced meat, and several people are writing to me at once. Without touching a phone, I glance at a small card next to my work, pick whose message to read, say the gist of my reply in my own words, see the cleaned-up text, say "send", and it goes.

## Why it belongs on glasses
- Uses: leaves your body free (hands busy and dirty, eyes stay on the work); draws in the world (the card sits on the counter next to the dough).
- Why it's better than the phone or laptop version: with hands in dough or meat I can't pick up or touch a phone. Here I only look and speak, and the message never covers my work area.

## Product or overlay
- Type: product: the message assistant is the experience.
- What the real version would sense: incoming messages from real messengers, my voice, and an AI that turns my spoken gist into a clean reply that keeps my meaning.
- Stand-in for the preview: three hard-coded sample messages arrive at start (senders: Mom, Alex, Work chat (default)). Each message has a hard-coded "what I said" gist and a hard-coded polished reply, so the demo never depends on voice, network or AI. Voice commands may be wired with ASR if it works, but every voice command has a big pinch button that does the same job. "Send" only shows a sent state; nothing is actually sent.

## Where things live
- Where the user is looking during the main task: down at the dough on the kitchen counter, about 55 cm in front of them.
- Kitchen counter: a virtual counter at real size, 90 cm high, 120 x 60 cm, about 45 cm in front of the user at start (default). A simple dough ball (about 20 cm wide) sits in its center as the work area (default).
- Message card: lies just right of and slightly below the dough, on the counter's right side, about 30 cm to the right of the dough, tilted up toward the user. Secondary: it never overlaps the dough. Size about 22 x 14 cm (default).
- Status dot: small circle (about 2 cm) in the card's top-left corner (default).
- Buttons: on the card's lower edge, inside the card, so they stay in view next to the work.

## Hands and input
- Start the Lens: voice "start" / pinch the Start button.
- See who wrote: voice "who wrote" / pinch the "Who wrote" button. Shows the list of sender names on the card.
- Open a message: voice: say the sender's name / pinch that name's row (each row is a big target).
- Reply: voice: say the gist / pinch the "Speak" button (stand-in fills in the hard-coded gist). Then the polished draft appears.
- Send: voice "send" / pinch the "Send" button.
- Remove: voice "remove" / pinch the "Remove" button.
- Targets are big (at least 4 cm tall) and highlight when aimed at.

## When things show
- Status dot: shows from the start; neutral gray until "start", then green while the Lens is ready.
- Message card: shows only the count and newest sender with the start of the text ("3 messages · Mom: Are you coming on Sunday..."), until I ask who wrote.
- Sender list: shows after "who wrote", hides when I open a message.
- Opened message: shows the sender name and full text; the reply draft appears under it after I speak; after "send" it shows "Sent" for about 2 seconds (default), then returns to the compact card.
- After "remove": that message disappears and the card shows the remaining count ("2 messages").
- If something needs attention out of view: a short soft chime when a new message lands (default). The card is placed so it stays in view; no arrow needed.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. At start, a neutral gray dot shows on the card. Saying "start" or pinching Start turns the dot green.
2. One card lies to the right of and below the dough on the counter and reads "3 messages", without covering the dough.
3. Pinching "Who wrote" (or saying it) shows three sender names on the card. Pinching a name opens that person's message.
4. Pinching "Speak" (or saying the gist) shows a cleaned-up reply draft on the card. Pinching "Send" (or saying "send") shows that the reply was sent.
5. Pinching "Remove" (or saying "remove") makes that message disappear, and the card then reads "2 messages".

## Out of scope
- Connecting to real messengers (Telegram, Viber and others) and really sending anything.
- Real AI rewriting and real speech recognition as a requirement for the demo.
- Recognizing the real dough, counter or kitchen.

## Risks and open questions
- Voice may not work in the preview; every voice command has a pinch button, and the demo uses the buttons if voice fails.
- "The reply keeps my real meaning" is shown only with hard-coded examples; only a real AI version can prove it (feel unproven).
- Comfort of glancing down-right while kneading is feel unproven without real glasses.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
