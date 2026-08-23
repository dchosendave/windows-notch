import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";

export function BatteryIcon({ percent, charging }: { percent: number; charging: boolean }) {
  if (charging) return <BatteryCharging size={15} />;
  if (percent <= 20) return <BatteryLow size={15} />;
  if (percent <= 65) return <BatteryMedium size={15} />;
  return <BatteryFull size={15} />;
}
