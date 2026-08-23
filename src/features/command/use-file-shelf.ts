import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { reportOperationalError } from "@/shared/lib/report-error";

const FILE_SHELF_KEY = "hamin.file-shelf";

export function useFileShelf(onDrop: (count: number) => void, persistent = false) {
  const [files, setFiles] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem(FILE_SHELF_KEY) ?? "[]"); } catch { return []; }
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "enter") { setDragging(true); return; }
      if (event.payload.type === "leave") { setDragging(false); return; }
      if (event.payload.type !== "drop") return;
      setDragging(false);
      const paths = event.payload.paths.slice(0, 8);
      setFiles(paths);
      onDrop(paths.length);
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    }).catch((error) => reportOperationalError("File shelf is unavailable", error));
    return () => { disposed = true; unlisten?.(); };
  }, [onDrop]);

  useEffect(() => {
    if (persistent) window.localStorage.setItem(FILE_SHELF_KEY, JSON.stringify(files));
    else window.localStorage.removeItem(FILE_SHELF_KEY);
  }, [files, persistent]);

  return { files, dragging, clear: () => setFiles([]) };
}
