// Node tests for the Lens logic that needs no scene: MessyHandsInbox,
// MessyHandsMemory and the sample data. They load the same .ts files the
// Lens runs, unchanged. Run from the repo root:  npm test
import {test} from "node:test"
import assert from "node:assert/strict"
import {MessyHandsInbox} from "../SpecsLens/Assets/Scripts/MessyHandsInbox.ts"
import {
  MessyHandsMemory,
  FakeMemoryStore,
  emptyState,
  hintLine,
} from "../SpecsLens/Assets/Scripts/MessyHandsMemory.ts"
import {SAMPLE_MESSAGES} from "../SpecsLens/Assets/Scripts/MessyHandsSampleMessages.ts"

function fresh(remembered) {
  const inbox = new MessyHandsInbox()
  inbox.load(SAMPLE_MESSAGES, remembered)
  return inbox
}

test("a clean start holds three messages", () => {
  const inbox = fresh()
  assert.equal(inbox.count, 3)
  assert.equal(inbox.headerLine(), "3 messages")
  assert.deepEqual(inbox.senders(), ["Mom", "Alex", "Work chat"])
})

test("header line covers one and none", () => {
  const inbox = fresh()
  inbox.openAt(0); inbox.removeCurrent()
  inbox.openAt(0); inbox.removeCurrent()
  assert.equal(inbox.headerLine(), "1 message")
  inbox.openAt(0); inbox.removeCurrent()
  assert.equal(inbox.headerLine(), "No messages")
  assert.equal(inbox.snippet(), "Nothing waiting for you.")
})

test("snippet names the newest sender and cuts long text at 30 characters", () => {
  const s = fresh().snippet()
  assert.ok(s.startsWith("Mom: "))
  assert.ok(s.endsWith("..."))
  assert.ok(s.length <= "Mom: ".length + 30 + 3)
})

test("openAt refuses rows that do not exist", () => {
  const inbox = fresh()
  assert.equal(inbox.openAt(-1), false)
  assert.equal(inbox.openAt(3), false)
  assert.equal(inbox.current(), null)
  assert.equal(inbox.openAt(2), true)
  assert.equal(inbox.current().sender, "Work chat")
})

test("send marks the message as replied but keeps it in the inbox", () => {
  const inbox = fresh()
  inbox.openAt(0)
  assert.equal(inbox.currentWasSent(), false)
  assert.equal(inbox.markCurrentSent(), true)
  assert.equal(inbox.currentWasSent(), true)
  assert.equal(inbox.count, 3)
  assert.deepEqual(inbox.sentIds(), ["mom-sunday"])
})

test("sending the same message twice records it once", () => {
  const inbox = fresh()
  inbox.openAt(0)
  inbox.markCurrentSent()
  inbox.markCurrentSent()
  assert.deepEqual(inbox.sentIds(), ["mom-sunday"])
})

test("send and remove with nothing open do nothing", () => {
  const inbox = fresh()
  assert.equal(inbox.markCurrentSent(), false)
  assert.equal(inbox.removeCurrent(), false)
  assert.equal(inbox.count, 3)
  assert.deepEqual(inbox.snapshot(), {sent: [], removed: []})
})

test("remove drops the open message, closes it and drops the count", () => {
  const inbox = fresh()
  inbox.openAt(1)
  assert.equal(inbox.removeCurrent(), true)
  assert.equal(inbox.count, 2)
  assert.equal(inbox.current(), null)
  assert.deepEqual(inbox.senders(), ["Mom", "Work chat"])
  assert.deepEqual(inbox.removedIds(), ["alex-keys"])
})

test("a removed message never comes back after a restart", () => {
  const inbox = fresh({sent: [], removed: ["alex-keys"]})
  assert.equal(inbox.count, 2)
  assert.ok(!inbox.senders().includes("Alex"))
})

test("a replied message comes back after a restart, marked as replied", () => {
  const inbox = fresh({sent: ["mom-sunday"], removed: []})
  assert.equal(inbox.count, 3)
  inbox.openAt(0)
  assert.equal(inbox.currentWasSent(), true)
})

test("snapshot is a copy, not a live view of the inbox", () => {
  const inbox = fresh()
  inbox.openAt(0); inbox.markCurrentSent()
  const snap = inbox.snapshot()
  snap.sent.push("tampered")
  assert.deepEqual(inbox.sentIds(), ["mom-sunday"])
})

test("memory round trip: save, load, forget", () => {
  const store = new FakeMemoryStore()
  const memory = new MessyHandsMemory(store)
  assert.equal(memory.hasAnything(), false)
  memory.save({sent: ["mom-sunday"], removed: ["alex-keys"]})
  assert.equal(memory.hasAnything(), true)
  assert.deepEqual(memory.load(), {sent: ["mom-sunday"], removed: ["alex-keys"]})
  memory.forget()
  assert.equal(memory.hasAnything(), false)
  assert.deepEqual(memory.load(), emptyState())
})

test("forget removes only this demo's keys, not the whole store", () => {
  const store = new FakeMemoryStore()
  store.putStringArray("other.lens.data", ["keep me"])
  const memory = new MessyHandsMemory(store)
  memory.save({sent: ["a"], removed: ["b"]})
  memory.forget()
  assert.deepEqual(store.keys(), ["other.lens.data"])
})

test("a runtime with no storage forgets safely and never throws", () => {
  const memory = new MessyHandsMemory(null)
  assert.equal(memory.available, false)
  memory.save({sent: ["x"], removed: []})
  memory.forget()
  assert.deepEqual(memory.load(), emptyState())
  assert.equal(memory.hasAnything(), false)
})

test("hint line wording matches the card", () => {
  assert.equal(hintLine(emptyState()), "")
  assert.equal(hintLine({sent: ["a"], removed: ["b"]}), "Last time: 1 replied, 1 cleared")
  assert.equal(hintLine({sent: [], removed: ["b", "c"]}), "Last time: 2 cleared")
})

test("sample data: three messages, stable unique ids, every field filled", () => {
  assert.equal(SAMPLE_MESSAGES.length, 3)
  const ids = SAMPLE_MESSAGES.map((m) => m.id)
  assert.deepEqual(ids, ["mom-sunday", "alex-keys", "work-standup"])
  assert.equal(new Set(ids).size, 3)
  for (const m of SAMPLE_MESSAGES) {
    for (const k of ["id", "sender", "text", "gist", "reply"]) assert.ok(m[k].length > 0, m.id + " " + k)
    assert.notEqual(m.reply, m.gist, "the rewrite is not an echo of the gist")
  }
})
