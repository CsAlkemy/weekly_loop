import time
from datetime import UTC, datetime, timedelta

from app.config.env import settings


class Clock:
    def __init__(self, start: datetime, ticking: bool) -> None:
        self._start = start
        self._ticking = ticking
        self._anchor = time.time()

    @property
    def ticking(self) -> bool:
        return self._ticking

    @property
    def start(self) -> datetime:
        return self._start

    @property
    def anchor(self) -> datetime:
        return datetime.fromtimestamp(self._anchor, UTC)

    def set(self, start: datetime, anchor: datetime) -> None:
        self._start = start
        self._anchor = anchor.timestamp()

    def restart(self) -> None:
        self._anchor = time.time()

    def advance(self, seconds: float) -> None:
        self._anchor -= seconds

    def now(self) -> datetime:
        if not self._ticking:
            return self._start
        return self._start + timedelta(seconds=time.time() - self._anchor)


clock = Clock(settings.app_now, ticking=settings.app_clock == "ticking")


def get_clock() -> Clock:
    return clock
