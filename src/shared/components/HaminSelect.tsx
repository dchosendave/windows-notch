import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type HaminSelectOption = { value: string; label: string };

export function HaminSelect({ value, options, ariaLabel, onValueChange }: {
  value: string;
  options: HaminSelectOption[];
  ariaLabel: string;
  onValueChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select value={value} onOpenChange={(open) => {
      window.dispatchEvent(new CustomEvent("hamin-select-open", { detail: open }));
    }} onValueChange={(nextValue) => {
      if (nextValue !== null) onValueChange(String(nextValue));
    }}>
      <SelectTrigger className="hamin-select-trigger" size="sm" aria-label={ariaLabel}>
        <span className="hamin-select-value" title={selectedOption?.label ?? value}>
          {selectedOption?.label ?? value}
        </span>
      </SelectTrigger>
      <SelectContent className="hamin-select-content" align="end" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem className="hamin-select-item" key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
