/** Provides malformed MobileConfig payload fixtures for field tests. */
export function brokenMobileConfigXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>', "<plist version=\"1.0\">", "<dict>", "<key>PayloadType</key>", "<string>Configuration</string>",
    "<key>PayloadContent</key>", "<array>", "<dict>", "<key>PayloadType</key>", "<string>com.apple.associated-domains</string>", "</array>", "</dict>", "</plist>",
  ].join("\n");
}
