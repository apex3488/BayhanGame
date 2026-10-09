import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fail, ok } from "../api/result";
import { getEntryForTests, invalidateResources, loadResource, resetResourceStoreForTests } from "./resource-store";

describe("resource-store auth recovery", () => {
  afterEach(() => {
    resetResourceStoreForTests();
  });

  it("reloads after invalidate when a previous unauthorized error was cached", async () => {
    const key = "player:ru";
    let calls = 0;

    await loadResource(key, async () => {
      calls += 1;
      return fail("unauthorized", "no init");
    });
    assert.equal(getEntryForTests(key).status, "error");
    assert.equal(calls, 1);

    invalidateResources("player:");
    assert.equal(getEntryForTests(key).status, "idle");

    await loadResource(key, async () => {
      calls += 1;
      return ok({ id: 1 });
    });
    assert.equal(getEntryForTests(key).status, "success");
    assert.equal(calls, 2);
    assert.deepEqual(getEntryForTests(key).data, { id: 1 });
  });
});
