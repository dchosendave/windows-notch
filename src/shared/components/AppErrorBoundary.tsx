import { Component, type ErrorInfo, type ReactNode } from "react";
import { nativeClient } from "@/shared/native/native-client";

type State = { error: Error | null };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Fatal Hamin interface error", error, info.componentStack);
    void nativeClient.setTaskbarReplacement(false).catch(() => undefined);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="fatal-recovery" role="alert"><strong>Hamin needs to recover</strong><small>The taskbar replacement was disabled for safety.</small><button type="button" onClick={() => window.location.reload()}>Reload Hamin</button></main>;
  }
}
