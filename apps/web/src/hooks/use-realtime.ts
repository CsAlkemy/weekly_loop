import { useEffect, useState } from "react";

import type { TeamEvent } from "@repo/library";
import { useQueryClient } from "@tanstack/react-query";

import { sessionKey } from "@/hooks/use-auth";
import { teamKey } from "@/hooks/use-teams";

function socketBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
}
const MAX_RETRY_MS = 10_000;

export function useTeamChannel(teamId: string | undefined): boolean {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let everConnected = false;
    let disposed = false;

    const connect = () => {
      let opened = false;
      socket = new WebSocket(`${socketBase()}/api/ws/teams/${teamId}`);

      socket.onmessage = (message) => {
        const event = JSON.parse(String(message.data)) as TeamEvent;

        if (event.type === "connected") {
          opened = true;
          attempts = 0;
          setLive(true);
          if (everConnected) {
            void queryClient.invalidateQueries({ queryKey: teamKey(teamId) });
          }
          everConnected = true;
        } else if (event.type === "invalidate") {
          void queryClient.invalidateQueries({
            queryKey: [...teamKey(teamId), event.resource],
          });
        }
      };

      socket.onclose = () => {
        setLive(false);
        if (disposed) return;
        if (!opened) void queryClient.invalidateQueries({ queryKey: sessionKey });
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempts, MAX_RETRY_MS));
        attempts += 1;
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [teamId, queryClient]);

  return live;
}
