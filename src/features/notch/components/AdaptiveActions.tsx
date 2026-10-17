import { Pin, PinOff } from "lucide-react";
import { contextActionIds } from "@/features/command/context-commands";
import type { HaminCommand } from "@/features/command/components/CommandPalette";
import { useForegroundContext } from "@/features/companion/use-foreground-context";
import type { HaminSettings } from "@/features/settings/settings-schema";

const labels = { development: "Development", browser: "Browsing", files: "Files", meeting: "Communication", media: "Media", application: "Quick actions" };

export function AdaptiveActions({ commands, pinned, onPin }: {
  commands: HaminCommand[];
  pinned: HaminSettings["pinnedContext"];
  onPin: (value: HaminSettings["pinnedContext"]) => void;
}) {
  const { context } = useForegroundContext(pinned === null);
  const category = pinned ?? context?.category ?? "application";
  const actions = contextActionIds(category).flatMap((id) => {
    const command = commands.find((item) => item.id === id);
    return command ? [command] : [];
  });
  return <section className="adaptive-actions" aria-label="Context actions">
    <header><span>{labels[category]}<small>{pinned ? "Pinned layout" : context?.processName || "Default layout"}</small></span>
      <button className="icon-button" aria-label={pinned ? "Unpin layout and follow active app" : "Pin current layout"} title={pinned ? "Follow active app" : "Pin this layout"} aria-pressed={pinned !== null} onClick={() => onPin(pinned ? null : category)}>{pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
    </header>
    <div>{actions.map((action) => <button key={action.id} title={action.description} onClick={action.run}><strong>{action.label}</strong><small>{action.description}</small></button>)}</div>
  </section>;
}
