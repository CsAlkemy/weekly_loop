from collections import defaultdict

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    def join(self, team_id: str, socket: WebSocket) -> None:
        self._rooms[team_id].add(socket)

    def leave(self, team_id: str, socket: WebSocket) -> None:
        self._rooms[team_id].discard(socket)
        if not self._rooms[team_id]:
            del self._rooms[team_id]

    async def publish(self, team_id: str, event: dict) -> None:
        for socket in list(self._rooms.get(team_id, ())):
            try:
                await socket.send_json(event)
            except Exception:
                self.leave(team_id, socket)

    async def invalidate(self, team_id: str, resource: str) -> None:
        await self.publish(team_id, {"type": "invalidate", "resource": resource})


hub = Hub()
