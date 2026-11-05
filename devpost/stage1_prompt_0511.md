You are improving the existing Spectacles Lens "Messy Hands Inbox" in this Lens Studio project (open in Lens Studio 5.24.1, MCP server `lens-studio` connected). Read first: ../devpost/design-brief.md, ../devpost/build-notes.md, Assets/Scripts/*, Assets/Scenarios/*. Use the ls-clad skills (start with the lens-studio router).

Goal: make the logic provably real and the scene look like a kitchen, for the "Learn AR with SPECS" judges (Design, Technical use of CLAD/Lens Studio/MCP, Innovation, Presentation). Work in this order and keep every existing LEAF scenario green.

1. Memory between sessions. The inbox remembers which messages were sent or removed across Lens restarts, using global.persistentStorageSystem.store (putStringArray/getStringArray). resetDemo() must also clear the stored state. Add a visible hint on the card only if it fits the design (for example "2 left from last time").

2. LEAF: grow from 6 to at least 20 meaningful scenarios, each with a clear name and a one-line comment saying what it proves. Cover: empty inbox after removing all three; pressing Start twice; Remove while a draft is open; the "Sent" state times out back to the list; actions in the wrong phase are ignored; reset twice; long message text is truncated on the card; memory survives a Lens refresh and is cleared by reset; readability (text size and near-white colour at 55 cm); reach for seated and standing users; card never covers the dough at several head angles; all touch targets at least 4 cm; and one end-to-end "demo-tour" scenario that walks start, who wrote, open Mom, speak, send, remove, with pauses long enough to film it. Pure-logic checks of MessyHandsInbox may run without the scene.

3. Scene look. Replace the flat look of the counter and the dough with textures/materials that read as a wooden or stone kitchen counter and a floured dough ball. Keep the existing objects DoughBall and CounterTop, their names, meshes and sizes (the card-placement scenario reads their AABB). Use only procedural materials or textures you generate yourself; no assets that need a Snap login, no downloads with unclear licence.

Rules:
- Do NOT touch the voice code path (VoiceCommands.enableVoice stays as it is); that is a separate step.
- Never write tokens, keys or credentials into any file.
- Do not run git. Do not delete existing scenarios.
- After all changes: recompile, check runtime logs are clean, then run the FULL LEAF suite three times in a row. Report every result honestly, including failures and how you fixed them.
- Save the raw text of the final three LEAF runs to ../devpost/leaf_runs_0611.txt (scenario id, status, timestamp).
- Capture preview screenshots of the new scene (standing view and the card) to ../devpost/walkthrough_v2/ as PNG.
- Append a section "Round 2 (06.11)" to ../devpost/build-notes.md: what changed, the scenario list with one line each, numbers, and anything that is not proven.
Finish with a short summary: scenario count, pass counts per run, files changed.
