import assert from "node:assert/strict";
import test from "node:test";
import { selectSingleGroupWinner } from "./judging-rules.ts";

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
