/** Verifies OpenAPI property schemas gain a null-compatible representation. */
import assert from "node:assert/strict";
import test from "node:test";
import { allowNull } from "../src/workspace-schema-nullability.js";

test("preserves primitive and array schema identities", () => {
  for (const schema of [undefined, null, true, false, "string", 1, []] as const) {
    assert.equal(allowNull(schema), schema);
  }
});

test("preserves already-nullable schema identity", () => {
  const schema = { nullable: true, type: "string" };

  assert.equal(allowNull(schema), schema);
});

test("wraps references and compositions with null", () => {
  for (const schema of [
    { $ref: "#/components/schemas/Setting" },
    { allOf: [{ type: "string" }] },
    { oneOf: [{ type: "string" }] },
    { anyOf: [{ type: "string" }] },
  ]) {
    const original = structuredClone(schema);

    assert.deepEqual(allowNull(schema), { anyOf: [schema, { type: "null" }] });
    assert.deepEqual(schema, original);
  }
});

test("transforms string and array types without mutating the input", () => {
  const stringSchema = { description: "Name", type: "string" };
  const arraySchema = { type: ["number", "string"] };
  const alreadyNullableArraySchema = { type: ["string", "null", "number"] };

  assert.deepEqual(allowNull(stringSchema), { description: "Name", type: ["string", "null"] });
  assert.deepEqual(allowNull(arraySchema), { type: ["number", "string", "null"] });
  assert.deepEqual(allowNull(alreadyNullableArraySchema), { type: ["string", "null", "number"] });
  assert.deepEqual(stringSchema, { description: "Name", type: "string" });
  assert.deepEqual(arraySchema, { type: ["number", "string"] });
  assert.deepEqual(alreadyNullableArraySchema, { type: ["string", "null", "number"] });
});

test("marks a schema nullable when its type is missing", () => {
  const schema = { title: "Unset type" };

  assert.deepEqual(allowNull(schema), { title: "Unset type", nullable: true });
  assert.deepEqual(schema, { title: "Unset type" });
});

test("adds null to enums without duplication", () => {
  const missingNull = { type: "string", enum: ["enabled", "disabled"] };
  const existingNull = { enum: ["enabled", null] };

  assert.deepEqual(allowNull(missingNull), { type: ["string", "null"], enum: ["enabled", "disabled", null] });
  assert.deepEqual(allowNull(existingNull), { nullable: true, enum: ["enabled", null] });
  assert.deepEqual(missingNull, { type: "string", enum: ["enabled", "disabled"] });
  assert.deepEqual(existingNull, { enum: ["enabled", null] });
});
