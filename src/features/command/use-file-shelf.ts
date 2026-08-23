import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { reportOperationalError } from "@/shared/lib/report-error";

export function useFileShelf(onDrop: (count: number) => void) {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return;
      const paths = event.payload.paths.slice(0, 8);
      setFiles(paths);
      onDrop(paths.length);
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    }).catch((error) => reportOperationalError("File shelf is unavailable", error));
    return () => { disposed = true; unlisten?.(); };
  }, [onDrop]);

  return { files, clear: () => setFiles([]) };
}
