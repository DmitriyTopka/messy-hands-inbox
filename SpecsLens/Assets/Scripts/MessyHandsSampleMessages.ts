/**
 * MessyHandsSampleMessages - the hard-coded stand-in inbox.
 *
 * The real product would read these from the user's messengers and send the
 * reply through an AI rewrite. For the preview demo every value is baked, so
 * the flow never depends on voice, network or a model being reachable.
 *
 * Owns: the sample content only. No scene access, no state, no decisions.
 */

export interface InboxMessage {
  /** Who wrote. */
  sender: string
  /** The message as it arrived. */
  text: string
  /** The gist the user speaks back, in their own words. */
  gist: string
  /** What the AI rewrite would make of that gist. */
  reply: string
}

/** Newest first - index 0 is the message named in the compact card. */
export const SAMPLE_MESSAGES: InboxMessage[] = [
  {
    sender: "Mom",
    text: "Are you coming on Sunday? I'll make the pie if you are, just tell me by tonight.",
    gist: "yes coming, bringing bread",
    reply: "Yes, I'll be there on Sunday. I'll bring fresh bread with me.",
  },
  {
    sender: "Alex",
    text: "Did you get the keys back from Sam? I need them before Friday.",
    gist: "got them, drop off tomorrow",
    reply: "I have the keys. I'll drop them off with you tomorrow.",
  },
  {
    sender: "Work chat",
    text: "Standup moved to 10:30 tomorrow. Can you still make it?",
    gist: "10:30 works",
    reply: "10:30 works for me, I'll be there.",
  },
]
