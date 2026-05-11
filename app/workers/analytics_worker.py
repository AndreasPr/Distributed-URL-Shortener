import logging
import time

from app.db.database import SessionLocal
from app.kafka.consumer import create_consumer
from app.repositories.analytics_repository import AnalyticsRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BATCH_SIZE = 100
BATCH_TIMEOUT_SECONDS = 5


def _flush_batch(db, repository: AnalyticsRepository, batch: list) -> None:
    if not batch:
        return

    short_codes = [event["short_code"] for event in batch]
    count = repository.batch_create_clicks(db, short_codes)
    db.commit()
    logger.info("Flushed batch of %d analytics events", count)


def main() -> None:
    repository = AnalyticsRepository()
    db = SessionLocal()

    logger.info("Analytics worker started (batch size: %d, timeout: %ds)...", BATCH_SIZE, BATCH_TIMEOUT_SECONDS)

    batch = []
    last_flush_time = time.time()

    try:
        consumer = None
        while consumer is None:
            consumer = create_consumer()
            if consumer is None:
                logger.info("Waiting for Kafka to become available...")
                time.sleep(5)

        for message in consumer:
            event = message.value
            batch.append(event)

            now = time.time()
            time_since_flush = now - last_flush_time

            # Flush on batch size OR timeout
            should_flush_batch_size = len(batch) >= BATCH_SIZE
            should_flush_timeout = time_since_flush >= BATCH_TIMEOUT_SECONDS and len(batch) > 0

            if should_flush_batch_size or should_flush_timeout:
                _flush_batch(db, repository, batch)
                batch = []
                last_flush_time = now
    finally:
        # Flush any remaining events before shutdown
        if batch:
            logger.info("Flushing %d remaining events before shutdown...", len(batch))
            _flush_batch(db, repository, batch)
        db.close()
        logger.info("Analytics worker stopped.")


if __name__ == "__main__":
    main()