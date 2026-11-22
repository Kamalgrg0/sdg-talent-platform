import test from "node:test";
import assert from "node:assert/strict";
import { errorTexts, joinedErrorText, firstErrorText } from "../src/lib/errorText.js";
import { errorMessage, fieldError } from "../src/lib/format.js";
import { ApiError, api } from "../src/lib/api.js";

function fakeApiResponse(payload, status = 400) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("old Django ErrorDetail repr is not shown to users", () => {
  const legacy = "[ErrorDetail(string='Incorrect email or password.', code='invalid')]";
  assert.equal(firstErrorText(legacy), "Incorrect email or password.");
  assert.equal(errorMessage({ message: legacy }), "Incorrect email or password.");
});

test("nested and multiple validation messages are presented readably", () => {
  const errors = {
    non_field_errors: ["This password is too common.", "This password is entirely numeric."],
    profile: { skills: ["Select a valid skill."] },
  };
  assert.equal(fieldError(errors, "non_field_errors"), "This password is too common. This password is entirely numeric.");
  assert.equal(fieldError(errors, "profile"), "Select a valid skill.");
  assert.deepEqual(errorTexts(errors), ["This password is too common.", "This password is entirely numeric.", "Select a valid skill."]);
  assert.equal(joinedErrorText(["Problem.", "Problem."]), "Problem.");
});

test("HTML error bodies are not rendered as error text", () => {
  assert.equal(firstErrorText("<!doctype html><html><body>traceback</body></html>"), "Request failed. Please try again.");
});

test("API wrapper handles login validation with detail array", async () => {
  globalThis.document = { cookie: "csrftoken=test-token" };
  globalThis.fetch = async () => fakeApiResponse({ detail: ["Incorrect email or password."] });
  await assert.rejects(() => api.post("/api/auth/login/", {}), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.message, "Incorrect email or password.");
    return true;
  });
});

test("API wrapper preserves field errors for form highlighting", async () => {
  globalThis.document = { cookie: "csrftoken=test-token" };
  globalThis.fetch = async () => fakeApiResponse({
    detail: "Please correct the highlighted fields.",
    errors: { password: ["This password is too common."] },
  });
  await assert.rejects(() => api.post("/api/auth/register/", {}), (error) => {
    assert.equal(error.message, "Please correct the highlighted fields.");
    assert.equal(fieldError(error.errors, "password"), "This password is too common.");
    return true;
  });
});

test("API wrapper deals with a standard DRF field-only response", async () => {
  globalThis.document = { cookie: "csrftoken=test-token" };
  globalThis.fetch = async () => fakeApiResponse({ password: ["Invalid password."] });
  await assert.rejects(() => api.post("/api/auth/register/", {}), (error) => {
    assert.equal(error.message, "Invalid password.");
    assert.equal(fieldError(error.errors, "password"), "Invalid password.");
    return true;
  });
});

test("frontend displays a helpful error when the Django server is stopped", async () => {
  globalThis.document = { cookie: "csrftoken=test-token" };
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(() => api.get("/api/dashboard/"), (error) => {
    assert.equal(error.status, 0);
    assert.match(error.message, /Django backend is running/);
    assert.doesNotMatch(error.message, /TypeError|fetch failed/);
    return true;
  });
});
