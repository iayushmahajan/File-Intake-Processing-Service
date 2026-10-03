"""Run with python -m app.dispatcher alongside the API and Celery worker."""

import signal
from pathlib import Path
from threading import Event

from app.core.config import DISPATCH_INTERVAL_SECONDS
from app.core.logging import configure_logging, get_logger
from app.services.dispatch import dispatch_once


def main():
    configure_logging()
    logger = get_logger(__name__)
    stopping = Event()
    for name in (signal.SIGINT, signal.SIGTERM):
        signal.signal(name, lambda *_: stopping.set())
    while not stopping.is_set():
        try:
            dispatch_once()
            Path("/tmp/intake-dispatcher-heartbeat").touch()
        except Exception:
            logger.exception("Dispatch cycle failed; will retry on the next cycle")
        stopping.wait(DISPATCH_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
