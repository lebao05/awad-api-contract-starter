# Initial Contract Observations

These observations were written before using an AI coding agent.

## Prediction 1: Idempotency and request validation order

**Contract section:** 4.2 — POST /v1/orders

**Contract sentence:**

"The server checks, in this order, and stops at the first step that fails:"

**Prediction and reason:**

I expect the agent to validate request body fields before checking whether an Idempotency-Key has already been used. However, section 4.2 explicitly requires a specific sequence of checks. I expect the agent might follow a conventional validation-first approach instead of respecting this exact order, potentially causing incorrect responses when clients retry requests.

## Prediction 2: Stable pagination

**Contract section:** 4.4 — GET /v1/orders

**Contract sentence:**

"Pages do not move under the client."

**Prediction and reason:**

I expect the agent to implement ordinary offset-based pagination without preserving a consistent snapshot of orders. If new orders are inserted between page requests, simple offset pagination may cause duplicate or skipped orders. The implementation must therefore ensure that pagination remains consistent throughout a client's browsing session.

## Initial Contract Test Observations

- Test: §4.2 a retry that lands on the other instance is still a replay. Contract sentence: "When step 6 succeeds, the server stores the key, a fingerprint of the body and the response, in the same transaction as the order." Agent behavior: Could not be evaluated because the test was cancelled when its migration subprocess failed (`npm run migrate failed: undefined`). Proposed clarification: "All service instances connected to the same database must share idempotency records so that a retry handled by any instance returns the original stored response."

- Test: §4.4 a cursor from one instance works on the other. Contract sentence: "A cursor stays valid for at least 24 hours." Agent behavior: Could not be evaluated because the test was cancelled when its migration subprocess failed (`npm run migrate failed: undefined`). Proposed clarification: "A cursor issued by any service instance must remain valid when presented to any other service instance connected to the same database, for at least 24 hours."

## Final Prediction Results

- Prediction 1: Did not come true — the test checking that the idempotency key is evaluated before body validation passed.
- Prediction 2: Did not come true — the test checking that newly placed orders do not shift subsequent pages passed.