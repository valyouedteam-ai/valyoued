import test from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "./jsonExtract.js";

test("extractJson pulls fenced JSON object", () => {
  const raw = 'Here you go:\n```json\n{"ok": true}\n```';
  assert.equal(extractJson(raw), '{"ok": true}');
});

test("extractJson pulls fenced JSON array", () => {
  const raw = '```json\n["one", "two"]\n```';
  assert.equal(extractJson(raw), '["one", "two"]');
});

test("extractJson falls back to first object span", () => {
  const raw = 'noise {"a": 1} tail';
  assert.equal(extractJson(raw), '{"a": 1}');
});
