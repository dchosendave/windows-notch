export function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function formatSourceName(sourceAppId: string) {
  const sourceParts = sourceAppId.split("!")[0].split("\\");
  const executable = sourceParts[sourceParts.length - 1] || sourceAppId;
  const normalized = executable.replace(/\.exe$/i, "").toLowerCase();
  const knownNames: Record<string, string> = {
    spotify: "Spotify",
    vlc: "VLC",
    chrome: "Chrome",
    msedge: "Microsoft Edge",
    firefox: "Firefox",
  };
  return knownNames[normalized] ?? executable.replace(/\.exe$/i, "").replace(/[._-]+/g, " ");
}
