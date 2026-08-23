import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  nullableMediaSessionSchema,
  mediaSessionSummarySchema,
  type MediaAction,
} from "./media-schema";
import type { MediaSessionSummary } from "./media-schema";
import { z } from "zod";
import { reportOperationalError } from "@/shared/lib/report-error";
import { nativeClient } from "@/shared/native/native-client";

const MEDIA_STATE_EVENT = "media-state";

function parseMediaState(payload: unknown) {
  return nullableMediaSessionSchema.parse(payload);
}

export function useMediaSession() {
  const [sessions, setSessions] = useState<MediaSessionSummary[]>([]);
  const [session, setSessionState] = useState<ReturnType<typeof parseMediaState>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const setSession = useCallback((next: ReturnType<typeof parseMediaState>) => { setSessionState(next); setLoading(false); setErrorState(null); }, []);
  const setError = useCallback((message: string) => { setErrorState(message); setLoading(false); }, []);

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;

    const connect = async () => {
      removeListener = await listen<unknown>(MEDIA_STATE_EVENT, (event) => {
        if (disposed) return;

        try {
          setSession(parseMediaState(event.payload));
        } catch (eventError) {
          setError(`Invalid media update: ${String(eventError)}`);
        }
      });

      if (disposed) {
        removeListener();
        return;
      }

      try {
        const initialState = await nativeClient.getMediaState();
        if (!disposed) setSession(parseMediaState(initialState));
      } catch (initializationError) {
        if (!disposed) setError(String(initializationError));
      }
    };

    void connect();
    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [setError, setSession]);

  const control = useCallback(async (action: MediaAction) => {
    try {
      return await nativeClient.controlMedia(action);
    } catch (controlError) {
      reportOperationalError(`Media command ${action} failed`, controlError);
      return false;
    }
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    try {
      return await nativeClient.seekMedia(positionMs);
    } catch (seekError) {
      reportOperationalError("Media seek failed", seekError);
      return false;
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(z.array(mediaSessionSummarySchema).parse(await nativeClient.listMediaSessions()));
    } catch (sessionError) {
      reportOperationalError("Unable to list media sessions", sessionError);
    }
  }, []);

  const selectSession = useCallback(async (sourceAppId: string) => {
    try {
      await nativeClient.selectMediaSession(sourceAppId);
      await refreshSessions();
      return true;
    } catch (sessionError) {
      setError(String(sessionError));
      return false;
    }
  }, [refreshSessions, setError]);

  useEffect(() => { void refreshSessions(); }, [refreshSessions, session?.sourceAppId]);

  return { session, sessions, loading, error, control, seek, refreshSessions, selectSession };
}
