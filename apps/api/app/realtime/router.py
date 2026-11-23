from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.auth.deps import session_user
from app.common.clock import clock
from app.config.env import settings
from app.db.models import Team
from app.db.session import SessionLocal
from app.realtime.hub import hub
from app.teams.service import has_team_access

router = APIRouter()


async def can_join(socket: WebSocket, team_id: str) -> bool:
    if socket.headers.get("origin") not in settings.web_origins:
        return False
    async with SessionLocal() as session:
        user = await session_user(socket.session, session)
        if user is None or await session.get(Team, team_id) is None:
            return False
        return await has_team_access(session, user, team_id)


@router.websocket("/ws/teams/{team_id}")
async def team_channel(socket: WebSocket, team_id: str) -> None:
    if not await can_join(socket, team_id):
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
