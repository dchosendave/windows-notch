import { useEffect, useState } from "react";
import { ChevronLeft, ChevronUp } from "lucide-react";
import { repairSettings, type HaminSettings } from "../settings-schema";
import { SettingToggle } from "./SettingToggle";
import { HaminSelect } from "@/shared/components/HaminSelect";
import { SelectSetting } from "./SelectSetting";

export type MonitorSummary = {
  index: number;
  name: string;
  width: number;
  height: number;
  primary: boolean;
};

type SettingsViewProps = {
  settings: HaminSettings;
  ready: boolean;
  error: string | null;
  monitors: MonitorSummary[];
  onBack: () => void;
  onCollapse: () => void;
  onChange: <Key extends keyof HaminSettings>(key: Key, value: HaminSettings[Key]) => void;
};

function CommitRange({ value, min, max, step = 1, label, onCommit }: {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: (value: number) => string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="range-setting">
      <span>{label(draft)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={() => onCommit(draft)}
        onKeyUp={() => onCommit(draft)}
        onBlur={() => onCommit(draft)}
      />
    </label>
  );
}

export function SettingsView({ settings, ready, error, monitors, onBack, onCollapse, onChange }: SettingsViewProps) {
  const displays = monitors.length
    ? monitors
    : [{ index: 0, name: "Primary display", width: 0, height: 0, primary: true }];
  const exportSettings = () => void navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
  const importSettings = () => {
    const source = window.prompt("Paste exported Hamin settings:");
    if (!source) return;
    try {
      const imported = repairSettings(JSON.parse(source)).settings;
      for (const [key, value] of Object.entries(imported)) onChange(key as keyof HaminSettings, value as never);
    } catch { window.alert("Those settings are not valid."); }
  };
  const applyProfile = (profile: HaminSettings["activeProfile"]) => {
    const profiles = {
      custom: {},
      work: { density: "comfortable", collapsedLayout: "track", capsuleMinimumPriority: "normal", contextAwareness: true },
      gaming: { density: "compact", collapsedLayout: "minimal", capsuleMinimumPriority: "high", expandOnHover: false, contextAwareness: true },
      minimal: { density: "compact", collapsedLayout: "minimal", capsuleMinimumPriority: "high", contextAwareness: false },
      presentation: { density: "compact", collapsedLayout: "minimal", capsuleMinimumPriority: "high", revealOnTrackChange: false },
    } satisfies Record<HaminSettings["activeProfile"], Partial<HaminSettings>>;
    for (const [key, value] of Object.entries(profiles[profile])) onChange(key as keyof HaminSettings, value as never);
    onChange("activeProfile", profile);
  };
  const addCustomAction = () => {
    const label = window.prompt("Action name:")?.trim();
    if (!label) return;
    const target = window.prompt("HTTPS URL, ms-settings URI, or absolute file path:")?.trim();
    if (!target) return;
    onChange("customActions", [...settings.customActions, { id: crypto.randomUUID(), label, target }].slice(0, 12));
  };
  const addFocusPreset = () => {
    const minutes = Number(window.prompt("Focus duration in minutes (1–180):"));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return;
    onChange("focusPresets", [...new Set([...settings.focusPresets, minutes])].sort((a, b) => a - b).slice(0, 5));
  };

  return (
    <div className="settings-view">
      <header className="expanded-header settings-header">
        <button className="icon-button" aria-label="Back to Hamin" title="Back" onClick={onBack}><ChevronLeft size={16} /></button>
        <div className="settings-title"><strong>Settings</strong><small>Saved automatically</small></div>
        <button className="icon-button settings-collapse" aria-label="Collapse Hamin" title="Collapse (Escape)" onClick={onCollapse}><ChevronUp size={16} /></button>
      </header>

      <div className="settings-scroll scroll-fade">
        <section className="settings-section">
          <h2>Behavior</h2>
          <div className="settings-grid">
            <SelectSetting label="Profile" description="Apply a behavior preset" ariaLabel="Configuration profile" value={settings.activeProfile} options={[{ value: "custom", label: "Custom" }, { value: "work", label: "Work" }, { value: "gaming", label: "Gaming" }, { value: "minimal", label: "Minimal" }, { value: "presentation", label: "Presentation" }]} onChange={(value) => applyProfile(value as HaminSettings["activeProfile"])} />
            <SelectSetting label="Operating mode" description="Replacement mode is experimental" ariaLabel="Operating mode" value={settings.operatingMode} options={[{ value: "companion", label: "Companion" }, { value: "replacement", label: "Taskbar replacement (Experimental)" }]} onChange={(value) => { if (value !== "replacement" || window.confirm("Experimental mode changes the Windows taskbar auto-hide state. Hamin will restore it when possible. Continue?")) onChange("operatingMode", value as HaminSettings["operatingMode"]); }} />
            <SelectSetting label="Auto-collapse" description="After no interaction" ariaLabel="Auto-collapse duration" value={String(settings.inactivityMs)} options={[{ value: "0", label: "Off" }, { value: "2000", label: "2 seconds" }, { value: "3000", label: "3 seconds" }, { value: "5000", label: "5 seconds" }, { value: "10000", label: "10 seconds" }]} onChange={(value) => onChange("inactivityMs", Number(value) as HaminSettings["inactivityMs"])} />
            <SettingToggle checked={settings.launchAtLogin} disabled={!ready} label="Launch at login" description="Start Hamin with Windows" onChange={(value) => onChange("launchAtLogin", value)} />
            <SettingToggle checked={settings.alwaysOnTop} disabled={!ready} label="Always on top" description="Keep the notch above windows" onChange={(value) => onChange("alwaysOnTop", value)} />
            <SettingToggle checked={settings.expandOnHover} disabled={!ready} label="Expand on hover" description="Open immediately on hover" onChange={(value) => onChange("expandOnHover", value)} />
            <SettingToggle checked={settings.revealOnTrackChange} disabled={!ready} label="Media reveal" description="Show title sequence on track change" onChange={(value) => onChange("revealOnTrackChange", value)} />
            <SettingToggle checked={settings.globalShortcut} disabled={!ready} label="Global shortcut" description={settings.shortcut.replace("CommandOrControl", "Ctrl")} onChange={(value) => onChange("globalShortcut", value)} />
            <SelectSetting label="Shortcut keys" description="Open the command palette" ariaLabel="Global shortcut keys" value={settings.shortcut} options={[{ value: "CommandOrControl+Shift+Space", label: "Ctrl+Shift+Space" }, { value: "Alt+Space", label: "Alt+Space" }, { value: "CommandOrControl+Alt+H", label: "Ctrl+Alt+H" }]} onChange={(value) => onChange("shortcut", value as HaminSettings["shortcut"])} />
            <SettingToggle checked={settings.wheelVolume} disabled={!ready} label="Volume wheel" description="Scroll on the collapsed notch" onChange={(value) => onChange("wheelVolume", value)} />
            <SettingToggle checked={settings.middleClickPlayPause} disabled={!ready} label="Middle-click media" description="Play or pause from collapsed mode" onChange={(value) => onChange("middleClickPlayPause", value)} />
            <SettingToggle checked={settings.clipboardHistoryEnabled} disabled={!ready} label="Clipboard history" description="Persist explicitly captured clipboard text" onChange={(value) => { onChange("clipboardHistoryEnabled", value); if (!value) onChange("clipboardHistory", []); }} />
            <SettingToggle checked={settings.contextAwareness} disabled={!ready} label="App context" description="Adapt to the foreground application" onChange={(value) => onChange("contextAwareness", value)} />
            <SettingToggle checked={settings.notificationInbox} disabled={!ready} label="Activity inbox" description="Keep recent capsules in the hub" onChange={(value) => onChange("notificationInbox", value)} />
            <SettingToggle checked={settings.fileShelfPersistence} disabled={!ready} label="Persistent file shelf" description="Restore held file paths after restart" onChange={(value) => onChange("fileShelfPersistence", value)} />
          </div>
        </section>

        <section className="settings-section">
          <h2>Position</h2>
          <div className="placement-settings">
            <div className="select-control"><span>Display</span><HaminSelect ariaLabel="Display" value={String(settings.monitor)} options={displays.map((monitor) => ({ value: String(monitor.index), label: `${monitor.name}${monitor.primary ? " (Primary)" : ""}${monitor.width ? ` - ${monitor.width}x${monitor.height}` : ""}` }))} onValueChange={(value) => onChange("monitor", Number(value))} /></div>
            <CommitRange value={settings.horizontalOffset} min={-300} max={300} step={5} label={(value) => `Horizontal: ${value}px`} onCommit={(value) => onChange("horizontalOffset", value)} />
            <CommitRange value={settings.topOffset} min={0} max={100} step={2} label={(value) => `Top: ${value}px`} onCommit={(value) => onChange("topOffset", value)} />
            <CommitRange value={settings.floatingOffset} min={0} max={30} label={(value) => `Floating gap: ${value}px`} onCommit={(value) => onChange("floatingOffset", value)} />
            <SettingToggle checked={settings.followActiveMonitor} disabled={!ready} label="Follow active display" description="Move to the foreground window's display" onChange={(value) => onChange("followActiveMonitor", value)} />
          </div>
        </section>

        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="appearance-settings">
            <div className="select-control"><span>Accent</span><HaminSelect ariaLabel="Accent color" value={settings.accent} options={[{ value: "blue", label: "Blue" }, { value: "violet", label: "Violet" }, { value: "emerald", label: "Emerald" }, { value: "artwork", label: "Album artwork" }]} onValueChange={(value) => onChange("accent", value as HaminSettings["accent"])} /></div>
            <div className="select-control"><span>Density</span><HaminSelect ariaLabel="Interface density" value={settings.density} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "large", label: "Large" }]} onValueChange={(value) => onChange("density", value as HaminSettings["density"])} /></div>
            <div className="select-control"><span>Collapsed content</span><HaminSelect ariaLabel="Collapsed notch content" value={settings.collapsedLayout} options={[{ value: "waves", label: "Waves and clock" }, { value: "track", label: "Track title" }, { value: "battery", label: "Battery" }, { value: "minimal", label: "Minimal dot" }]} onValueChange={(value) => onChange("collapsedLayout", value as HaminSettings["collapsedLayout"])} /></div>
            <div className="select-control"><span>Surface</span><HaminSelect ariaLabel="Surface style" value={settings.surfaceStyle} options={[{ value: "glass", label: "Glass" }, { value: "solid", label: "Solid" }, { value: "oled", label: "OLED black" }]} onValueChange={(value) => onChange("surfaceStyle", value as HaminSettings["surfaceStyle"])} /></div>
            <div className="select-control"><span>Audio waves</span><HaminSelect ariaLabel="Audio wave visualization" value={settings.audioVisualization} options={[{ value: "reactive", label: "Reactive" }, { value: "off", label: "Off" }]} onValueChange={(value) => onChange("audioVisualization", value as HaminSettings["audioVisualization"])} /></div>
            <CommitRange value={Math.round(settings.surfaceOpacity * 100)} min={82} max={100} label={(value) => `Opacity: ${value}%`} onCommit={(value) => onChange("surfaceOpacity", value / 100)} />
            <CommitRange value={settings.cornerRadius} min={10} max={28} label={(value) => `Corners: ${value}px`} onCommit={(value) => onChange("cornerRadius", value)} />
            <div className="select-control"><span>Motion</span><HaminSelect ariaLabel="Animation style" value={settings.motionStyle} options={[{ value: "instant", label: "Instant" }, { value: "responsive", label: "Responsive" }, { value: "smooth", label: "Smooth" }]} onValueChange={(value) => onChange("motionStyle", value as HaminSettings["motionStyle"])} /></div>
            <SettingToggle checked={settings.animations} disabled={!ready} label="Animations" description="Motion and transition effects" onChange={(value) => onChange("animations", value)} />
          </div>
        </section>

        <section className="settings-section">
          <h2>Companion capsules</h2>
          <div className="select-control capsule-priority"><span>Minimum priority</span><HaminSelect ariaLabel="Minimum capsule priority" value={settings.capsuleMinimumPriority} options={[{ value: "low", label: "All updates" }, { value: "normal", label: "Normal and important" }, { value: "high", label: "Important only" }]} onValueChange={(value) => onChange("capsuleMinimumPriority", value as HaminSettings["capsuleMinimumPriority"])} /></div>
          <div className="settings-grid">
            {(Object.entries(settings.capsuleCategories) as Array<[keyof HaminSettings["capsuleCategories"], boolean]>).map(([category, checked]) => <SettingToggle key={category} checked={checked} disabled={!ready} label={`${category[0].toUpperCase()}${category.slice(1)}`} description="Allow temporary companion updates" onChange={(value) => onChange("capsuleCategories", { ...settings.capsuleCategories, [category]: value })} />)}
          </div>
        </section>

        <section className="settings-section">
          <h2>Clipboard</h2>
          <div className="settings-grid">
            <SelectSetting label="Clipboard expiry" description="Remove captured text later" ariaLabel="Clipboard expiry" value={String(settings.clipboardExpiryMinutes)} options={[{ value: "0", label: "Never" }, { value: "15", label: "15 minutes" }, { value: "60", label: "1 hour" }, { value: "1440", label: "1 day" }]} onChange={(value) => onChange("clipboardExpiryMinutes", Number(value) as HaminSettings["clipboardExpiryMinutes"])} />
          </div>
        </section>

        <section className="settings-section">
          <h2>Custom commands</h2>
          <div className="settings-actions"><button type="button" onClick={addCustomAction}>Add command</button>{settings.customActions.map((action) => <button type="button" title={action.target} key={action.id} onClick={() => onChange("customActions", settings.customActions.filter((item) => item.id !== action.id))}>Remove {action.label}</button>)}</div>
        </section>

        <section className="settings-section">
          <h2>Focus presets</h2>
          <div className="settings-actions"><button type="button" onClick={addFocusPreset}>Add duration</button>{settings.focusPresets.map((minutes) => <button type="button" key={minutes} disabled={settings.focusPresets.length === 1} onClick={() => onChange("focusPresets", settings.focusPresets.filter((item) => item !== minutes))}>Remove {minutes} min</button>)}</div>
        </section>

        <section className="settings-section">
          <h2>Backup</h2>
          <div className="settings-actions"><button type="button" onClick={exportSettings}>Copy settings</button><button type="button" onClick={importSettings}>Import settings</button><button type="button" onClick={() => onChange("onboardingComplete", false)}>Replay onboarding</button><button type="button" onClick={() => { if (window.confirm("Clear the quick note and captured clipboard history?")) { onChange("quickNote", ""); onChange("clipboardHistory", []); } }}>Clear private data</button></div>
        </section>
      </div>
      {error && <p className="settings-error">{error}</p>}
    </div>
  );
}
