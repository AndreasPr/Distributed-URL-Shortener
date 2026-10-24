"""Thread-safe, process-wide limits shared by all default provider instances."""

import threading
from datetime import datetime, timezone

from app.core.config import settings
from app.llm.base import BudgetExceeded
from app.observability.metrics import llm_budget_remaining


class Limits:
    def __init__(self, concurrency: int, daily_budget: int):
        if concurrency < 1 or daily_budget < 0:
            raise ValueError("Invalid LLM limits")
        self.slots = threading.BoundedSemaphore(concurrency)
        self.lock = threading.Lock()
        self.budget = daily_budget
        self.used = 0
        self.day = datetime.now(timezone.utc).date()

    def reserve(self) -> None:
        with self.lock:
            today = datetime.now(timezone.utc).date()
            if today > self.day:
                self.day, self.used = today, 0
            llm_budget_remaining.set(max(0, self.budget - self.used))
            if self.used >= self.budget:
                raise BudgetExceeded("Daily LLM request budget exhausted")
            self.used += 1
            llm_budget_remaining.set(self.budget - self.used)


GLOBAL_LIMITS = Limits(settings.LLM_CONCURRENCY, settings.LLM_DAILY_BUDGET)

llm_budget_remaining.set(settings.LLM_DAILY_BUDGET)
