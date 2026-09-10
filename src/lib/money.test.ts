import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatPKR } from "./money";

describe("formatPKR", () => {
  it("renders grouped thousands with Rs prefix", () => {
    assert.equal(formatPKR(12450), "Rs 12,450");
    assert.equal(formatPKR(0), "Rs 0");
  });
});
