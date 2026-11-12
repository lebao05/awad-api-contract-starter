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

## Final prediction results

- Prediction 1: [Came true / Did not come true] — [Explain briefly based on the implementation.]
- Prediction 2: [Came true / Did not come true] — [Explain briefly based on the implementation.]