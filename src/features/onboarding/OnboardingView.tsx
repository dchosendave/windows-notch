import { useState } from "react";
import { Bell, Command, ShieldCheck, Sparkles } from "lucide-react";
import { PRODUCT } from "@/shared/config/product";

const steps = [
  { icon: Sparkles, title: "A quieter Windows companion", copy: "See media, timers, devices, and important activity without opening another window." },
  { icon: Bell, title: "Capsules, on your terms", copy: "Temporary updates disappear automatically and remain available in the Companion Hub." },
  { icon: ShieldCheck, title: "Private by default", copy: "Clipboard capture is explicit. Provider integrations stay off until you enable them." },
];

export function OnboardingView({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const item = steps[step];
  const Icon = item.icon;
  return <div className="onboarding-view">
    <div className="onboarding-mark"><Icon size={25} /></div>
    <small>{PRODUCT.displayName} · {step + 1} of {steps.length}</small>
    <h1>{item.title}</h1><p>{item.copy}</p>
    <div className="onboarding-dots">{steps.map((_, index) => <i key={index} data-active={index === step} />)}</div>
    <button onClick={() => step === steps.length - 1 ? onFinish() : setStep((value) => value + 1)}>{step === steps.length - 1 ? "Get started" : "Continue"} <Command size={13} /></button>
  </div>;
}
