import time
from datetime import datetime, timedelta

from app.config.env import settings


class Clock:
    def __init__(self, start: datetime, ticking: bool) -> None:
        self._start = start
        self._ticking = ticking
        self._origin = time.monotonic()

    def restart(self) -> None:
        self._origin = time.monotonic()

    def advance(self, seconds: float) -> None:
        self._origin -= seconds

    def now(self) -> datetime:
        if not self._ticking:
            return self._start
        return self._start + timedelta(seconds=time.monotonic() - self._origin)


clock = Clock(settings.app_now, ticking=settings.app_clock == "ticking")


def get_clock() -> Clock:
    return clock
