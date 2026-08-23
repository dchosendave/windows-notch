import { Activity, Bell, CalendarClock, ChevronLeft, ChevronUp, ExternalLink, MonitorUp, ShieldCheck, Trash2 } from "lucide-react";
import type { Capsule } from "@/shared/hooks/use-transient-activity";
import type { ForegroundContext, ProcessMetrics } from "@/shared/native/native-client";
import { MotionButton } from "@/shared/motion/MotionButton";

function relativeTime(time: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1_000));
  if (seconds < 60) return "Now";
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}

export function CompanionView({ context, history, metrics, onBack, onCollapse, onRefreshContext, onRefreshMetrics, onDismiss, onClear, onOpenPrivacy, onOpenCalendar }: {
  context: ForegroundContext | null;
  history: Capsule[];
  metrics: ProcessMetrics | null;
  onBack: () => void;
  onCollapse: () => void;
  onRefreshContext: () => void;
  onRefreshMetrics: () => void;
  onDismiss: (id: number) => void;
  onClear: () => void;
  onOpenPrivacy: () => void;
  onOpenCalendar: () => void;
}) {
  return <div className="companion-view">
    <header className="expanded-header tasks-header">
      <MotionButton className="icon-button" aria-label="Back" onClick={onBack}><ChevronLeft size={16} /></MotionButton>
      <div className="settings-title"><strong>Companion hub</strong><small>Context and recent activity</small></div>
      <MotionButton className="icon-button" aria-label="Collapse" onClick={onCollapse}><ChevronUp size={16} /></MotionButton>
    </header>
    <div className="companion-grid scroll-fade">
      <section className="context-card">
        <header><span><MonitorUp size={14} /> Active context</span><button onClick={onRefreshContext}>Refresh</button></header>
        <strong>{context?.title || "No foreground application"}</strong>
        <small>{context ? `${context.processName} · ${context.category}` : "Context actions appear when Windows reports an active app"}</small>
      </section>
      <section className="companion-actions">
        <button onClick={onOpenPrivacy}><ShieldCheck size={16} /><span><strong>Privacy center</strong><small>Camera and microphone access</small></span><ExternalLink size={12} /></button>
        <button onClick={onOpenCalendar}><CalendarClock size={16} /><span><strong>Calendar</strong><small>Connect a provider for meetings</small></span><ExternalLink size={12} /></button>
      </section>
      <section className="diagnostics-card"><span><Activity size={14} /><strong>Diagnostics</strong><small>{metrics ? `${metrics.memoryMb.toFixed(1)} MB · ${Math.floor(metrics.uptimeSeconds / 60)}m uptime` : "Metrics not loaded"}</small></span><button onClick={onRefreshMetrics}>Refresh</button></section>
      <section className="activity-inbox">
        <header><span><Bell size={14} /> Recent activity <em>{history.length}</em></span>{history.length > 0 && <button aria-label="Clear activity" onClick={onClear}><Trash2 size={12} /> Clear</button>}</header>
        <div>{history.length === 0 ? <p><Activity size={16} /> Capsules will be kept here temporarily.</p> : history.map((item) => <article key={item.id} data-priority={item.priority}><span><strong>{item.message}</strong><small>{item.detail || item.category} · {relativeTime(item.occurredAt)}</small></span><button aria-label={`Dismiss ${item.message}`} onClick={() => onDismiss(item.id)}>×</button></article>)}</div>
      </section>
      <p className="capability-note">Downloads, meeting controls, and calendar events activate only when a supported provider is connected. Hamin never fabricates integration data.</p>
    </div>
  </div>;
}
