import asyncio
import json
import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from uuid import uuid4

import psycopg
from fastapi import WebSocket
from sqlalchemy import text

from app.config.env import settings
from app.db.session import engine

CHANNEL = "weekly_loop_events"
RETRY_SECONDS = 1

log = logging.getLogger(__name__)


class Hub:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self.origin = uuid4().hex
        self.listening = asyncio.Event()

    def join(self, team_id: str, socket: WebSocket) -> None:
        self._rooms[team_id].add(socket)

    def leave(self, team_id: str, socket: WebSocket) -> None:
        self._rooms[team_id].discard(socket)
        if not self._rooms[team_id]:
            del self._rooms[team_id]

    async def deliver(self, team_id: str, event: dict) -> None:
        for socket in list(self._rooms.get(team_id, ())):
            try:
                await socket.send_json(event)
            except Exception:
                self.leave(team_id, socket)

    async def publish(self, team_id: str, event: dict) -> None:
        await self.deliver(team_id, event)
        await self._notify({"origin": self.origin, "teamId": team_id, "event": event})

    async def publish_control(self, event: dict) -> None:
        await self._notify({"origin": self.origin, "teamId": None, "event": event})

    async def invalidate(self, team_id: str, resource: str) -> None:
        await self.publish(team_id, {"type": "invalidate", "resource": resource})

    async def _notify(self, message: dict) -> None:
        async with engine.connect() as connection:
            await connection.execute(
                text("SELECT pg_notify(:channel, :payload)"),
                {"channel": CHANNEL, "payload": json.dumps(message)},
            )
            await connection.commit()

    async def listen(self, on_control: Callable[[dict], Awaitable[None]]) -> None:
        url = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
        while True:
            try:
                async with await psycopg.AsyncConnection.connect(url, autocommit=True) as conn:
                    await conn.execute(f"LISTEN {CHANNEL}")
                    self.listening.set()
                    async for note in conn.notifies():
                        message = json.loads(note.payload)
                        if message["origin"] == self.origin:
                            continue
                        if message["teamId"] is None:
                            await on_control(message["event"])
                        else:
                            await self.deliver(message["teamId"], message["event"])
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Live update listener lost its connection; retrying")
            self.listening.clear()
            await asyncio.sleep(RETRY_SECONDS)


hub = Hub()
