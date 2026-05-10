import logging
import time

from app.db.database import SessionLocal
from app.kafka.consumer import create_consumer
from app.repositories.analytics_repository import AnalyticsRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    repository = AnalyticsRepository()
    db = SessionLocal()

    logger.info("Analytics worker started...")

    try:
        consumer = None
        while consumer is None:
            consumer = create_consumer()
            if consumer is None:
                logger.info("Waiting for Kafka to become available...")
                time.sleep(5)

        for message in consumer:
            event = message.value
            short_code = event["short_code"]

            repository.create_click(db, short_code)
            db.commit()

            logger.info("Processed analytics event: %s", short_code)
    finally:
        db.close()


if __name__ == "__main__":
    main()