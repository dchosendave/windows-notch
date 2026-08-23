export function SettingToggle({ checked, disabled, label, description, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span className="setting-copy"><strong>{label}</strong><small>{description}</small></span>
      <input className="setting-switch" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
