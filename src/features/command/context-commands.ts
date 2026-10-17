const preferred: Record<string, string[]> = {
  development: ["timer", "files"],
  browser: ["clipboard", "files"],
  files: ["files", "explorer"],
  meeting: ["audio", "clipboard"],
  media: ["audio"],
};

export function contextActionIds(category?: string): string[] {
  return Object.prototype.hasOwnProperty.call(preferred, category ?? "") ? preferred[category!] : ["timer", "files"];
}

export function contextualCommands<T extends { id: string }>(commands: T[], category?: string) {
  const ids = Object.prototype.hasOwnProperty.call(preferred, category ?? "") ? preferred[category!] : [];
  return [...commands].sort((a, b) => {
    const rank = (id: string) => ids.includes(id) ? ids.indexOf(id) : ids.length;
    return rank(a.id) - rank(b.id);
  });
}
