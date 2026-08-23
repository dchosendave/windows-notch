export function SettingToggle({ checked, disabled, label, description, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <motion.label className="setting-row" whileHover={disabled ? undefined : { backgroundColor: "rgba(255,255,255,0.055)" }} transition={{ duration: 0.12 }}>
      <span className="setting-copy"><strong>{label}</strong><small>{description}</small></span>
      <input className="setting-switch" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </motion.label>
  );
}
import { motion } from "motion/react";
