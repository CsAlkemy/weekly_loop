import logging
from urllib.parse import urlsplit

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.auth.deps import session_user
from app.common.clock import clock
from app.config.env import settings
from app.db.models import Team
from app.db.session import SessionLocal
from app.realtime.hub import hub
from app.teams.service import has_team_access

router = APIRouter()
log = logging.getLogger(__name__)


def allowed_origin(origin: str | None, served_from: str | None) -> bool:
    if origin is None:
        return False
    if origin in settings.web_origins:
        return True
    return served_from is not None and urlsplit(origin).netloc == served_from


async def refusal(socket: WebSocket, team_id: str) -> str | None:
    headers = socket.headers
    served_from = headers.get("x-forwarded-host") or headers.get("host")
    if not allowed_origin(headers.get("origin"), served_from):
        return f"origin {headers.get('origin')} does not match {served_from}"
    async with SessionLocal() as session:
        user = await session_user(socket.session, session)
        if user is None:
            return "not signed in"
        if await session.get(Team, team_id) is None:
            return "no such team"
        if not await has_team_access(session, user, team_id):
            return f"{user.id} has no access to this team"
    return None


@router.websocket("/ws/teams/{team_id}")
async def team_channel(socket: WebSocket, team_id: str) -> None:
    reason = await refusal(socket, team_id)
    if reason is not None:
        log.warning("Live connection to %s refused: %s", team_id, reason)
        await socket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await socket.accept()
    hub.join(team_id, socket)
    try:
        await socket.send_json({"type": "connected", "now": clock.now().isoformat()})
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.leave(team_id, socket)
