import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { reportOperationalError } from "@/shared/lib/report-error";
import { z } from "zod";

const FILE_SHELF_KEY = "hamin.file-shelf";
const fileShelfSchema = z.array(z.string().min(1).max(32_767)).max(8);

export function useFileShelf(onDrop: (count: number) => void, persistent = false) {
  const [files, setFiles] = useState<string[]>(() => {
    try {
      const parsed = fileShelfSchema.safeParse(JSON.parse(window.localStorage.getItem(FILE_SHELF_KEY) ?? "[]"));
      return parsed.success ? parsed.data : [];
    } catch { return []; }
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
      const parsed = fileShelfSchema.safeParse([...new Set(event.payload.paths)].slice(0, 8));
      const paths = parsed.success ? parsed.data : [];
      setFiles(paths);
      if (paths.length) onDrop(paths.length);
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

  return { files, dragging, clear: () => setFiles([]), remove: (path: string) => setFiles((items) => items.filter((item) => item !== path)) };
}
