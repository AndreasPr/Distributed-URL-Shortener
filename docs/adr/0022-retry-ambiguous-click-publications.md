# 0022: Retry ambiguous click publications with stable event identity

## Evidence

The Redis pause experiment recorded 121 successful redirects, 103 analytics rows and 19
reported drops. The repeat is preserved separately in chaos/results/. The publisher previously
abandoned each event on its first exception. Redis socket timeout cannot prove that XADD was
not executed: a paused server can process buffered input after recovery. Therefore an event
can appear both as a delivered row and a locally abandoned publication. This explains a possible
overcount; aggregate historical results cannot establish individual event identity.

## Decision

Retry publication in the existing background thread with the same event object/UUID, bounded
by EVENT_PUBLISH_ATTEMPTS (60) and the existing EVENT_RETRY_BACKOFF (0.25 seconds).
A confirmed retry avoids declaring the event dropped. Multiple stream deliveries are safe for
analytics because event_id has a unique constraint and inserts ignore conflicts. No HTTP request
thread waits for retries. Shutdown interrupts retry waits and retains bounded close behavior.

## Consequences

A 20-second paused Redis can recover while the current event remains pending; subsequent clicks
wait in the existing bounded queue. Longer outages can fill the queue or exhaust retries. This
is not a durable outbox or guaranteed delivery. Drop metric help now describes local abandonment,
not proven absence from the broker. Strict chaos reconciliation remains unchanged and may still
fail for ambiguous exhaustion, concurrent traffic or restarts. No historical FAIL is rewritten.

Tests simulate acceptance followed by a lost acknowledgment, checking that retries keep the UUID
and do not increment drops after success; another test verifies bounded exhaustion. Existing
analytics duplicate-delivery and blocked-broker redirect tests remain in the gate.
