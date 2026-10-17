import assert from "node:assert/strict";
import { contextualCommands, contextActionIds } from "./context-commands.ts";
import { repairSettings } from "../settings/settings-schema.ts";

const commands = ["files", "audio", "timer", "clipboard", "explorer", "custom"].map(id => ({ id }));
assert.deepEqual(contextualCommands(commands, "development").map(item => item.id), ["timer", "files", "audio", "clipboard", "explorer", "custom"]);
assert.equal(contextualCommands(commands, "browser")[0].id, "clipboard");
assert.equal(contextualCommands(commands, "meeting")[0].id, "audio");
assert.deepEqual(contextualCommands(commands), commands);
assert.deepEqual(contextualCommands(commands, "application"), commands);
for (const category of ["unknown", "toString", "constructor", "__proto__"]) {
  assert.deepEqual(contextualCommands(commands, category), commands);
}
assert.equal(commands[0].id, "files");
console.log("Context command checks passed");
assert.deepEqual(contextActionIds("development"), ["timer", "files"]);
assert.deepEqual(contextActionIds("browser"), ["clipboard", "files"]);
assert.deepEqual(contextActionIds("files"), ["files", "explorer"]);
assert.deepEqual(contextActionIds("meeting"), ["audio", "clipboard"]);
assert.deepEqual(contextActionIds("media"), ["audio"]);
assert.deepEqual(contextActionIds("unknown"), ["timer", "files"]);
assert.deepEqual(contextActionIds("toString"), ["timer", "files"]);
assert.equal(repairSettings({}).settings.pinnedContext, null);
assert.equal(repairSettings({ pinnedContext: "browser" }).settings.pinnedContext, "browser");
assert.equal(repairSettings({ pinnedContext: "invalid" }).settings.pinnedContext, null);
console.log("Adaptive layout and settings checks passed");
// Removed placeholder settings must not break older settings files.
const legacy = repairSettings({ autoUpdates: false, calendarProvider: "system", meetingControls: true, privacyIndicators: false, density: "large" });
assert.equal(legacy.repaired, false);
assert.equal(legacy.settings.density, "large");
assert.equal("autoUpdates" in legacy.settings, false);
console.log("Legacy settings checks passed");
