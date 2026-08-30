import assert from "node:assert/strict";
import test from "node:test";
import {
  selectProvisionalGroupWinner,
  selectSingleGroupWinner,
} from "./judging-rules.ts";

test("selects the highest-scoring application regardless of input order", () => {
  const winner = selectSingleGroupWinner("Group 1", [
    { applicationId: "a", teamName: "Alpha", total: 120 },
    { applicationId: "b", teamName: "Beta", total: 144 },
  ]);

  assert.equal(winner.applicationId, "b");
});

test("blocks automatic selection when the leading score is tied", () => {
  assert.throws(
    () =>
      selectSingleGroupWinner("Group 2", [
        { applicationId: "a", teamName: "Alpha", total: 144 },
        { applicationId: "b", teamName: "Beta", total: 144 },
      ]),
    /Group 2 has a tie between Alpha and Beta/,
  );
});

test("does not select a winner from an empty group", () => {
  assert.throws(() => selectSingleGroupWinner("Group 3", []), /no applications/);
});

test("selects a provisional winner when votes are incomplete", () => {
  const winner = selectProvisionalGroupWinner("Group 4", [
    { applicationId: "a", teamName: "Alpha", total: 32, scoreCount: 1 },
    { applicationId: "b", teamName: "Beta", total: 0, scoreCount: 0 },
  ]);

  assert.equal(winner.applicationId, "a");
});

test("uses stable input order for a provisional tie", () => {
  const winner = selectProvisionalGroupWinner("Group 5", [
    { applicationId: "a", teamName: "Alpha", total: 0, scoreCount: 0 },
    { applicationId: "b", teamName: "Beta", total: 0, scoreCount: 0 },
  ]);

  assert.equal(winner.applicationId, "a");
});
