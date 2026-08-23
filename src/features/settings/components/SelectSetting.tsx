import { HaminSelect, type HaminSelectOption } from "@/shared/components/HaminSelect";

export function SelectSetting({ label, description, value, options, ariaLabel, onChange }: {
  label: string;
  description: string;
  value: string;
  options: HaminSelectOption[];
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  return <div className="select-setting"><span><strong>{label}</strong><small>{description}</small></span><HaminSelect ariaLabel={ariaLabel} value={value} options={options} onValueChange={onChange} /></div>;
}
