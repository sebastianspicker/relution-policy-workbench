/** Verifies plist parsing resists prototype-key input and preserves mobileconfig structure. */
import { describe, expect, it } from "vitest";
import { parseMobileConfig, updateMobileConfigDetails } from "./mobileconfig-editor.js";

describe("mobileconfig editor parser", () => {
  it("preserves attacker-controlled plist keys as own null-prototype properties", () => {
    const parsed = parseMobileConfig(plist([
      "<key>__proto__</key>",
      "<dict><key>PayloadType</key><string>evil</string></dict>",
    ]));

    expect(Object.getPrototypeOf(parsed)).toBeNull();
    expect(Object.hasOwn(parsed, "__proto__")).toBe(true);
    expect(parsed.__proto__).toEqual(Object.assign(Object.create(null), { PayloadType: "evil" }));
  });

  it.each(["__proto__", "constructor", "toString"])("treats inherited payload type name %s as Configuration", (payloadType) => {
    const details = updateMobileConfigDetails({}, plist([
      "<key>PayloadType</key>",
      `<string>${payloadType}</string>`,
    ]));

    expect(details.firstLevelPayloadType).toBe("CONFIGURATION");
  });

  it("rejects duplicate dictionary keys", () => {
    expect(() => parseMobileConfig(plist([
      "<key>PayloadType</key>",
      "<string>Configuration</string>",
      "<key>PayloadType</key>",
      "<string>Command</string>",
    ]))).toThrow("Mobileconfig dict contains a duplicate key: PayloadType");
  });

  it.each(["1invalid", "Infinity", "NaN", "1e9999"])("rejects malformed or non-finite plist real %s", (value) => {
    expect(() => parseMobileConfig(plist([
      "<key>NumericValue</key>",
      `<real>${value}</real>`,
    ]))).toThrow(/plist real/iu);
  });
});

function plist(entries: string[]): string {
  return ["<plist version=\"1.0\"><dict>", ...entries, "</dict></plist>"].join("");
}
