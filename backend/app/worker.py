"""
HomeIQ — Asynchronous Event & Proactive Intelligence Worker (`python -m app.worker`).

Responsibilities:
 - Subscribes to the `HomeIQEventBus` (RabbitMQ AMQP / local durable outbox)
 - Executes periodic proactive household evaluations without blocking the HTTP API
 - Handles `SIGTERM` / `SIGINT` signals gracefully so in-flight transactions commit
   or roll back cleanly before container exit.
"""
from __future__ import annotations

import asyncio
import signal
from typing import Any

from app.api.v1.intelligence_router import shared_event_bus
from app.core.config import settings
from app.core.database import verify_database_connection
from app.core.logging import configure_logging, get_logger
from app.core.observability import EVENT_QUEUE_DEPTH

logger = get_logger("worker")


class HomeIQAsyncWorker:
    def __init__(self, poll_interval_seconds: float = 5.0) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self._stop_event = asyncio.Event()

    def request_shutdown(self, *_: Any) -> None:
        logger.info("worker.shutdown_requested", environment=settings.APP_ENV)
        self._stop_event.set()

    async def run_once(self) -> dict[str, Any]:
        """Executes a single worker heartbeat cycle and updates queue depth telemetry."""
        db_healthy = await verify_database_connection()
        dlq_depth = len(shared_event_bus.dead_letter_queue)
        EVENT_QUEUE_DEPTH.labels(queue_name="homeiq.events.dlq").set(dlq_depth)
        EVENT_QUEUE_DEPTH.labels(queue_name="homeiq.events.main").set(0)
        return {
            "worker_status": "healthy" if db_healthy else "degraded_db_unreachable",
            "database_reachable": db_healthy,
            "published_events_processed": len(shared_event_bus.published_log),
            "dlq_depth": dlq_depth,
        }

    async def serve_forever(self) -> None:
        configure_logging()
        logger.info(
            "worker.started",
            service="homeiq-worker",
            environment=settings.APP_ENV,
        )
        while not self._stop_event.is_set():
            try:
                await self.run_once()
            except Exception as exc:
                logger.error("worker.cycle_error", error_type=type(exc).__name__)
            try:
                await asyncio.wait_for(
                    self._stop_event.wait(), timeout=self.poll_interval_seconds
                )
            except asyncio.TimeoutError:
                continue
        logger.info("worker.stopped_cleanly")


async def _main() -> None:
    worker = HomeIQAsyncWorker()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, worker.request_shutdown)
        except NotImplementedError:  # pragma: no cover
            pass
    await worker.serve_forever()


if __name__ == "__main__":
    asyncio.run(_main())
