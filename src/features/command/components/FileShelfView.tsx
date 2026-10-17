import { useEffect, useState } from "react";
import { ChevronLeft, Copy, ExternalLink, File, FolderOpen, Trash2, X } from "lucide-react";
import { nativeClient, type FilePreview } from "@/shared/native/native-client";

export function FileShelfView({ files, onBack, onRemove, onClear }: {
  files: string[];
  onBack: () => void;
  onRemove: (path: string) => void;
  onClear: () => void;
}) {
  const [selected, setSelected] = useState(files[0]);
  const path = files.includes(selected) ? selected : files[0];
  const [preview, setPreview] = useState<{ path: string; value: FilePreview } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const current = preview?.path === path ? preview.value : null;
  const name = path?.split(/[\\/]/).pop();

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setError("");
    setStatus("");
    if (path) void nativeClient.previewShelfFile(path).then((value) => {
      if (!cancelled) setPreview({ path, value });
    }).catch((reason) => { if (!cancelled) setError(String(reason)); });
    return () => { cancelled = true; };
  }, [path, files]);

  const act = async (action: () => Promise<unknown>, message: string) => {
    try { await action(); setStatus(message); }
    catch (reason) { setStatus(`Could not complete action: ${String(reason)}`); }
  };

  return <div className="shelf-view">
    <header className="expanded-header">
      <button className="icon-button" aria-label="Back to Hamin" onClick={onBack}><ChevronLeft size={16} /></button>
      <div className="settings-title"><strong>Drop & act</strong><small>{files.length}/8 items · kept on this device</small></div>
      {files.length > 0 && <button className="icon-button" aria-label="Clear shelf (keeps original files)" onClick={onClear}><Trash2 size={15} /></button>}
    </header>
    {!path ? <div className="shelf-empty"><FolderOpen size={28} /><strong>Drop something here</strong><span>Preview images and text, copy content, or jump to a file.</span><small>Up to 8 items per drop. Original files stay untouched.</small></div> : <>
      <div className="shelf-workbench">
        <nav className="shelf-items" aria-label="Held files">
          {files.map((file) => <div key={file} data-selected={file === path}>
            <button aria-pressed={file === path} title={file} onClick={() => setSelected(file)}><File size={13} /><span>{file.split(/[\\/]/).pop()}</span></button>
            <button aria-label={`Remove ${file.split(/[\\/]/).pop()} from shelf`} onClick={() => onRemove(file)}><X size={12} /></button>
          </div>)}
        </nav>
        <section className="shelf-detail" aria-label="File preview">
          <strong title={path}>{name}</strong>
          <small>{current ? current.kind === "folder" ? "Folder" : `${new Intl.NumberFormat().format(current.size)} bytes` : error ? "Unavailable" : "Loading preview…"}</small>
          <div className="shelf-preview">
            {error ? <p role="alert">{error}</p> : current?.kind === "image" && current.content ? <img src={current.content} alt={name} onError={() => setError("This image could not be decoded")} />
              : current?.kind === "text" ? <pre>{current.content || "Empty text file"}</pre>
              : current ? <p>{current.kind === "folder" ? "Open this folder to explore its contents." : "No inline preview. Supports PNG, JPEG, GIF and WebP up to 5 MB, and UTF-8 text up to 64 KB."}</p> : <p>Reading file…</p>}
          </div>
          <div className="shelf-actions">
            <button onClick={() => void act(() => nativeClient.launchCustomTarget(path), "Opened")}><ExternalLink size={12} />Open</button>
            <button onClick={() => void act(() => nativeClient.revealFile(path), "Shown in Explorer")}><FolderOpen size={12} />Reveal</button>
            <button onClick={() => void act(() => navigator.clipboard.writeText(path), "Path copied")}><Copy size={12} />Path</button>
            {current?.kind === "text" && <button onClick={() => void act(() => navigator.clipboard.writeText(current.content ?? ""), "Text copied")}><Copy size={12} />Text</button>}
          </div>
        </section>
      </div>
      <footer className="shelf-footer"><span role="status">{status || "A new drop replaces the shelf. Removing items keeps your files."}</span><button onClick={() => void act(() => navigator.clipboard.writeText(files.join("\r\n")), "All paths copied")}>Copy all paths</button></footer>
    </>}
  </div>;
}
