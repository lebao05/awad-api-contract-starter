# NOTES.md

## 1. Initial Contract Observations

These observations were written before using an AI coding agent.

### Prediction 1: Idempotency and request validation order

**Contract section:** 4.2 — POST /v1/orders

**Contract sentence:**

"The server checks, in this order, and stops at the first step that fails:"

**Prediction and reason:**

I expected the agent to validate request body fields before checking whether an Idempotency-Key had already been used. However, Section 4.2 explicitly requires a specific sequence of checks. I expected the agent might follow a conventional validation-first approach instead of respecting this exact order, potentially causing incorrect responses when clients retry requests.

### Prediction 2: Stable pagination

**Contract section:** 4.4 — GET /v1/orders

**Contract sentence:**

"Pages do not move under the client."

**Prediction and reason:**

I expected the agent to implement ordinary offset-based pagination without preserving a consistent snapshot of orders. If new orders were inserted between page requests, simple offset pagination could cause duplicate or skipped orders. The implementation must therefore ensure that pagination remains consistent throughout a client's browsing session.

## 2. Initial Contract Test Observations

The initial contract test run reported 27 passing tests, 0 failing tests, and 2 cancelled tests.

1. **Test:** `§4.2 a retry that lands on the other instance is still a replay`  
   **Contract sentence:** "When step 6 succeeds, the server stores the key, a fingerprint of the body and the response, in the same transaction as the order."  
   **Agent behavior:** Could not be evaluated because the test was cancelled when its migration subprocess failed (`npm run migrate failed: undefined`).  
   **Proposed clarification:** "All service instances connected to the same database must share idempotency records so that a retry handled by any instance returns the original stored response."

2. **Test:** `§4.4 a cursor from one instance works on the other`  
   **Contract sentence:** "A cursor stays valid for at least 24 hours."  
   **Agent behavior:** Could not be evaluated because the test was cancelled when its migration subprocess failed (`npm run migrate failed: undefined`).  
   **Proposed clarification:** "A cursor issued by any service instance must remain valid when presented to any other service instance connected to the same database, for at least 24 hours."

## 3. Final Prediction Results

- **Prediction 1:** Did not come true. The test checking that the idempotency key is evaluated before body validation passed.
- **Prediction 2:** Did not come true. The test checking that newly placed orders do not shift subsequent pages passed.

## 4. Step 6 — Ambiguous Contract Sentences and Implementation Decisions

I asked the AI coding agent to review the entire `CONTRACT.md`, identify sentences that could reasonably have multiple interpretations, and explain which interpretation it followed when implementing the API.

I reviewed its explanations and recorded my decisions below.

### 1. Section 1 — What is covered by `/v1`

**Original sentence:**

"Every endpoint in this contract lives under `/v1`."

**Possible interpretations:**
- A: Every endpoint mentioned in the document, including legacy endpoints, must use the `/v1` prefix.
- B: The statement applies to the versioned API, while Section 5 explicitly defines legacy endpoints that remain unversioned.

**Agent's interpretation:** B.

**My decision:** I agree with interpretation B. Section 5 explicitly describes legacy endpoints such as `GET /menu` that remain available without the `/v1` prefix. The implementation should preserve these legacy endpoints while providing the new versioned API.

### 2. Section 1 — Unknown request fields

**Original sentence:**

"The server ignores request fields it does not know."

**Possible interpretations:**
- A: Unknown properties are ignored at every level of a JSON request, including nested objects such as order lines.
- B: Only unknown top-level properties are ignored; nested unknown properties may be rejected.

**Agent's interpretation:** A.

**My decision:** I agree with interpretation A. The contract does not restrict this rule to top-level properties. Ignoring unknown nested properties also makes the API more tolerant of additional client-side fields without changing the behavior of known fields.

### 3. Section 1 — ID spelling in URL paths

**Original sentence:**

"Ids are positive integers."

**Possible interpretations:**
- A: IDs must use canonical positive-decimal notation, so `/menu/01` is invalid.
- B: Any digit string representing a positive integer is accepted, so `/menu/01` refers to ID `1`.

**Agent's interpretation:** B.

**My decision:** I agree with interpretation B. The contract specifies that the ID must represent a positive integer but does not explicitly prohibit leading zeroes. Therefore, the implementation accepts digit strings with leading zeroes while rejecting zero and non-digit values.

### 4. Section 1 — Timestamp precision

**Original sentence:**

"Timestamps are ISO 8601 strings in UTC, e.g. `2026-10-15T01:20:00.000Z`."

**Possible interpretations:**
- A: The exact millisecond precision and `Z` format shown in the example are mandatory.
- B: The example is illustrative, and other valid ISO 8601 UTC representations are acceptable.

**Agent's interpretation:** The implementation uses JavaScript's `toISOString()` to produce the canonical millisecond format.

**My decision:** I accept the use of a consistent canonical timestamp format. The phrase "e.g." indicates that the timestamp is an example rather than an explicitly mandatory format. However, using `toISOString()` produces predictable UTC timestamps and avoids inconsistent formatting.

### 5. Section 2 — What counts as one validation problem

**Original clause:**

"one entry per problem found (not just the first)"

**Possible interpretations:**
- A: Report one error for each invalid field or violated field rule.
- B: Report one error per invalid object or array, even if multiple fields inside it are invalid.

**Agent's interpretation:** A for individually invalid fields; one error is reported when an item itself is not an object.

**My decision:** I agree with interpretation A. Reporting individual field errors provides more useful feedback to API clients because they can identify and correct multiple invalid fields in one request. For malformed objects, reporting one error for the invalid item is reasonable.

**Remaining ambiguity:** The contract does not precisely define error granularity for malformed arrays and non-object nested items.

### 6. Section 4.2 — Whether `Content-Type` is enforced

**Original sentence:**

"Request headers: `Content-Type: application/json` and `Idempotency-Key`, a string of 1 to 255 characters chosen by the client, one per order it intends to place (a UUID is a good choice)."

**Possible interpretations:**
- A: Both headers are mandatory, and the server must reject requests with a missing or incorrect content type.
- B: The sentence describes the expected client request, but the server only enforces explicitly defined validation rules.

**Agent's interpretation:** B. The implementation does not reject requests based on `Content-Type` if the request body can be parsed.

**My decision:** I accept interpretation B based on the explicit validation rules in Section 4.2. The contract does not define a specific error response for an incorrect content type or include a content-type check in the listed validation sequence.

**Remaining ambiguity:** The contract should explicitly state whether the server must enforce `Content-Type` or whether it is only a client-side requirement.

### 7. Section 4.2 — Meaning of "characters" in the key limit

**Original phrase:**

"a string of 1 to 255 characters"

**Possible interpretations:**
- A: Count Unicode code points or UTF-8 bytes.
- B: Count the string units used by the implementation runtime.

**Agent's interpretation:** B. The implementation uses JavaScript's `string.length`, which counts UTF-16 code units.

**My decision:** I accept the implementation's use of UTF-16 code units as a consistent technical choice. However, the contract does not define what constitutes a character for Unicode strings, so this is an implementation decision rather than an unambiguous requirement.

**Remaining ambiguity:** A future version of the contract should explicitly define the counting method to ensure consistent behavior across programming languages.

### 8. Section 4.2 — Idempotency persistence and in-flight requests

**Original sentence:**

"When step 6 succeeds, the server stores the key, a fingerprint of the body and the response, in the same transaction as the order."

**Possible interpretations:**
- A: The idempotency key, fingerprint, response, and order must all become visible together in one transaction.
- B: A temporary pending reservation may be visible before order creation, while the completed response and order must be committed atomically.

**Agent's interpretation:** B. The implementation creates a pending reservation before order creation and stores the completed response in the transaction containing the order.

**My decision:** I accept interpretation B because Section 4.2 also requires a `409` response while the first request is still processing. A pending reservation allows another request to detect that an operation is already in progress. The completed order and replay response must still be committed atomically.

**Remaining ambiguity:** The contract should explicitly distinguish between the temporary pending state and the final successful transaction.

### 9. Section 4.4 — When there are "no more orders"

**Original sentence:**

"`nextCursor` is `null` if and only if there are no more orders after this page."

**Possible interpretations:**
- A: "No more orders" includes newly created orders that appear after the first page request.
- B: "No more orders" refers to the remaining orders within the original pagination snapshot.

**Agent's interpretation:** B. The implementation uses a snapshot boundary so that newly created orders do not appear in later pages of an existing page walk.

**My decision:** I agree with interpretation B. Section 4.4 also states that pages do not move under the client. A fixed snapshot makes pagination consistent and prevents new orders from unexpectedly changing the remaining pages.

### 10. Section 5 — Scope of "every legacy response"

**Original sentence:**

"Every legacy response, errors included, carries these two headers:"

**Possible interpretations:**
- A: The headers apply only to responses from the four explicitly listed legacy endpoints.
- B: The headers apply to every response handled by the legacy routing path, including unrecognized unversioned routes.

**Agent's interpretation:** B for the legacy handler. `/health` is handled separately.

**My decision:** I agree with interpretation B. The word "every" suggests that the headers should be included in legacy error responses as well as successful responses. However, `/health` is a separate endpoint and should follow its own requirements.

## 5. Overall Reflection

This review helped me understand that an API contract can contain requirements that are technically valid but still open to different implementation interpretations. Some sentences are clarified by nearby requirements, while others do not specify details such as Unicode character counting, content-type enforcement, or transaction boundaries.

I decided to accept the agent's interpretations when they were consistent with the surrounding contract requirements and the intended API behavior. For unresolved cases, I documented the implementation decision and the clarification that would make the contract more precise.

This process also showed me why developers should not blindly follow an AI agent's interpretation. I need to review its assumptions, compare them with the contract, and make the final decisions myself.