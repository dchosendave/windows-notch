import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AppWindow, ChevronLeft, Clipboard, Copy, ExternalLink, File, FileText, Search, Timer, Trash2, Volume2, X } from "lucide-react";

export type HaminCommand = {
  id: string;
  label: string;
  description: string;
  icon: "windows" | "volume" | "timer" | "clipboard" | "diagnostics";
  run: () => void;
};

const icons = {
  windows: AppWindow,
  volume: Volume2,
  timer: Timer,
  clipboard: Clipboard,
  diagnostics: Activity,
};

export function CommandPalette({ commands, note, clipboardHistory, shelfFiles, onClearShelf, onRemoveFile, onOpenFile, onRevealFile, onCopyFile, onBack, onNoteChange, onPasteCapture, onCopyHistory }: {
  commands: HaminCommand[];
  note: string;
  clipboardHistory: string[];
  shelfFiles: string[];
  onClearShelf: () => void;
  onRemoveFile: (path: string) => void;
  onOpenFile: (path: string) => void;
  onRevealFile: (path: string) => void;
  onCopyFile: (path: string) => void;
  onBack: () => void;
  onNoteChange: (note: string) => void;
  onPasteCapture: () => void;
  onCopyHistory: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [noteDraft, setNoteDraft] = useState(note);
  useEffect(() => setNoteDraft(note), [note]);
  const filtered = useMemo(() => commands.filter((command) => `${command.label} ${command.description}`.toLowerCase().includes(query.toLowerCase())), [commands, query]);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" }), [activeIndex]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + delta + filtered.length) % filtered.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      filtered[activeIndex]?.run();
    }
  };

  return <div className="command-view">
    <header className="command-header">
      <button className="icon-button" aria-label="Back to Hamin" onClick={onBack}><ChevronLeft size={16} /></button>
      <label className="command-search"><Search size={14} /><input autoFocus value={query} placeholder="Search…" aria-label="Search commands" aria-controls="hamin-command-results" aria-activedescendant={filtered[activeIndex] ? `command-${filtered[activeIndex].id}` : undefined} onKeyDown={handleSearchKeyDown} onChange={(event) => setQuery(event.target.value)} /></label>
    </header>
    <div className="command-body scroll-fade">
      <div id="hamin-command-results" className="command-results" role="listbox" aria-label="Available commands">
        {filtered.map((command, index) => { const Icon = icons[command.icon]; return <button id={`command-${command.id}`} ref={(element) => { resultRefs.current[index] = element; }} key={command.id} role="option" aria-selected={index === activeIndex} data-active={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={command.run}><Icon size={16} /><span><strong>{command.label}</strong><small>{command.description}</small></span></button>; })}
        {!filtered.length && <p className="command-empty">No matching command</p>}
      </div>
      {!query && <aside className="command-side">
        <label className="quick-note"><span><FileText size={13} /> Quick note</span><textarea maxLength={500} value={noteDraft} placeholder="Keep a small note…" onChange={(event) => setNoteDraft(event.target.value)} onBlur={() => onNoteChange(noteDraft)} /></label>
        <div className="clipboard-panel"><header><span><Clipboard size={13} /> Clipboard</span><button onClick={onPasteCapture}>Capture</button></header>{clipboardHistory.slice(0, 3).map((item, index) => <button key={`${index}-${item}`} title={item} onClick={() => onCopyHistory(item)}><Copy size={11} /><span>{item}</span></button>)}</div>
        <div className="file-shelf"><header><span><File size={13} /> File shelf</span>{shelfFiles.length > 0 && <button aria-label="Clear file shelf" title="Clear shelf" onClick={onClearShelf}><Trash2 size={12} /></button>}</header>{shelfFiles.length === 0 ? <small>Drop files onto Hamin to hold them here</small> : shelfFiles.slice(0, 4).map((path) => <div key={path} title={path}><File size={11} /><button className="file-name" title="Open" onClick={() => onOpenFile(path)}>{path.split(/[\\/]/).pop()}</button><button aria-label="Copy path" onClick={() => onCopyFile(path)}><Copy size={10} /></button><button aria-label="Reveal in Explorer" onClick={() => onRevealFile(path)}><ExternalLink size={10} /></button><button aria-label="Remove from shelf" onClick={() => onRemoveFile(path)}><X size={10} /></button></div>)}</div>
      </aside>}
    </div>
  </div>;
}
