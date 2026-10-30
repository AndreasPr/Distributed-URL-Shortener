# ADR 0028: Random short-code generation

Status: Accepted (step 1.2)

Renumbered from the duplicate 0001 short-code record; the baseline ADR remains 0001.

## Previous behavior

URLRepository inserted a URL without a code, flushed to obtain the PostgreSQL
SERIAL ID, and encoded it with app/utils/base62.py. URLService committed the
transaction. The alphabet is a-z, A-Z, 0-9; zero encodes as an empty string but
normal database IDs start at 1. Encoding is injective for positive integers, so
properly managed shared sequences do not collide across API replicas. Sequence
resets, manually assigned codes, or independent databases with overlapping IDs
can invalidate that assumption. The unique constraint is the final safeguard.

The sequence reveals ordering and makes adjacent URLs trivial to enumerate.
Variable-length encodings can also collide with static route names. The utility
remains available and tested; existing stored codes are not rewritten.

## Decision: option (b)

Use RandomCodeGenerator behind the small CodeGenerator Protocol in
app/services/code_generator.py. Each candidate contains seven independent draws
from the 62-character alphabet using secrets.choice (OS-backed randomness).
URLService accepts an optional generator and passes it to URLRepository; callers
can replace generation without changing the HTTP layer.

For each candidate, the repository executes INSERT ... ON CONFLICT (short_code)
DO NOTHING RETURNING short_code. The database unique constraint arbitrates
simultaneous inserts across replicas. A conflict returns no row, so another
candidate is tried. There is no vulnerable existence-check-then-insert sequence,
no process-local uniqueness set, and no coordination through Redis.

At most ten candidates are tried. Reserved seven-character route names metrics
and shorten consume attempts but are never inserted. Add future static routes
to that set when appropriate. The service commits only after successful
allocation; the repository does not commit or roll back the caller's transaction.
Conflicts do not abort the transaction, unlike catching a PostgreSQL unique
violation without a savepoint. Other database errors propagate immediately.
Exhaustion raises CodeGenerationExhausted and follows existing generic HTTP 500
handling, without a new response schema. Successful shortening still returns
only {"short_code": "..."}; redirect and analytics response contracts are unchanged.

## Collision probability and security

The space is 62^7 = 3,521,614,606,208 candidates (about 41.7 bits). Randomness does
not guarantee uniqueness: among 100,000 independent candidates, the approximate
probability of at least one collision is 0.142%. At n occupied codes, a draw's
collision probability is approximately n / 62^7; bounded retries make ordinary
collisions inexpensive. The database, not this probability, guarantees that two
committed rows cannot share a code. Existing legacy codes participate in the
same constraint. Failed attempts may consume sequence IDs, which is harmless.

Codes no longer reveal adjacent database IDs. They are not authentication tokens:
URLs remain public, guessing can succeed, legacy codes remain enumerable, and
rate limiting is still deferred to step 2.1. A new random code does not protect a
sensitive destination from disclosure or unauthorized access.

## Alternatives

A sequence plus a secret-keyed reversible permutation can avoid random candidate
collisions while obscuring sequence order. It needs a carefully specified domain,
cryptographic construction, secret distribution, and key-rotation policy; rotating
a key can map new IDs onto codes allocated under an old key unless namespaces or
collision handling are planned. That complexity is not warranted here. Option
(b) needs no new secret or rotation procedure.

Catching IntegrityError with per-attempt savepoints is also viable, but targeted
ON CONFLICT avoids aborting transactions and distinguishes code collisions from
other constraint errors. Unbounded retries risk hanging requests; prechecking a
code or relying on an in-memory set is unsafe across replicas.

## Failure modes and validation

Database outages and non-code constraint violations fail immediately. High
occupancy, a defective generator, or repeated collisions can exhaust ten attempts.
Concurrent inserts can wait on the conflicting transaction's commit/rollback;
the attempt cap is not a wall-clock timeout. All replicas must use the same
PostgreSQL database and its unique constraint. Mixed old/new writers remain
protected by that constraint, but old writers lack retry logic; roll out the new
implementation to every writer. No schema migration or key distribution is needed.

Tests in tests/test_code_generation.py cover a reproducible 100,000-candidate
sample, seven-character URL safety, production use of secrets.choice, forced
collisions, retry exhaustion, unrelated integrity errors, and reserved routes.
The large sample injects a seeded PRNG only in the test: an unseeded assertion
of perfect uniqueness would legitimately flake roughly once in 705 runs. It is a
regression sample, not proof that random generation is collision-free.

The Docker test starts eight threads with independent sessions/services, forces
all their first candidates to collide, and commits 200 destinations to a migrated
PostgreSQL database. It checks unique codes and exact destination mappings.
This exercises database arbitration across connections, not a deployed multi-host
cluster. The shared disposable fixture never touches the user's database.

Run make check and:

```sh
RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest tests/test_code_generation.py tests/test_migrations.py -v
```

## Context

The former ID-derived codes exposed ordering and tied generation to persistence. Multiple API replicas need collision-safe creation without application-level coordination.

## Consequences

Random codes require database uniqueness and bounded collision retries. They reduce sequential enumeration but remain public identifiers, not authorization secrets.
