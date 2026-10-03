const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function moduleFrom(name, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, `../app/${name}.ts`), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", compiled)(mod, mod.exports, (key) => imports[key]);
  return mod.exports;
}

const annotations = moduleFrom("harmonicAnnotations");
const { readRevealMarker, requestMachineReveal } = moduleFrom("harmonicReveal", { "./harmonicAnnotations": annotations });
const sha = "a".repeat(64);

test("persistent reveal marker is written before machine action and survives reload", () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.equal(readRevealMarker(storage, sha), false);
  assert.equal(requestMachineReveal(storage, sha, () => { throw Error("should not confirm"); }), "revealed_persisted");
  assert.equal(readRevealMarker(storage, sha), true);
  assert.equal(data.get(annotations.revealStorageKey(sha)), "true");
});

test("blocked storage cannot block Analyze after explicit exit, but cancellation stays blind", () => {
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.throws(() => readRevealMarker(blocked, sha), /blocked/);
  assert.equal(requestMachineReveal(blocked, sha, () => false), "cancelled");
  assert.equal(requestMachineReveal(blocked, sha, () => true), "revealed_session_only");
  assert.equal(requestMachineReveal(null, null, () => true), "revealed_session_only");
});

test("malformed marker cannot be mistaken for unseen history", () => {
  assert.throws(() => readRevealMarker({ getItem: () => "false" }, sha), /损坏/);
});
