# Error handling

ChainBounty API errors use a small JSON contract and explicit HTTP status
codes. Controllers should reject expected client errors before performing
mutations and reserve HTTP 500 for unexpected server failures.

This guide documents the patterns already used by the API and the conventions
to follow when adding or changing endpoints.

## Error response contract

Every error response has a top-level error string:

~~~json
{
  "error": "Bounty not found"
}
~~~

Use detail for one safe explanation that applies to the whole request:

~~~json
{
  "error": "Bounty cannot be claimed",
  "detail": "The bounty is not OPEN."
}
~~~

Use details for structured field-validation failures:

~~~json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "description",
      "message": "Submission description is required"
    }
  ]
}
~~~

The fields have distinct purposes:

- error is required and is the stable summary a client can display or log.
- detail is optional safe context for the request as a whole.
- details is an optional array of field-level validation errors. Each entry
  should contain field and message.

Do not return stack traces, database errors, secrets, tokens, connection
strings, raw Prisma exceptions, or a caught exception string to API clients.
Log unexpected exceptions on the server and return a stable public message.

## Status-code guide

### 400 Bad Request

Use HTTP 400 when request syntax or input is invalid.

Examples in this repository include:

- malformed JSON, handled by the global error handler in src/app.ts;
- missing or invalid required fields;
- invalid query limits or field types;
- invalid path-parameter formats.

Prefer the validation shape when a field can be identified:

~~~ts
if (!description || description.trim().length === 0) {
  res.status(400).json({
    error: 'Validation failed',
    details: [
      {
        field: 'description',
        message: 'Submission description is required',
      },
    ],
  });
  return;
}
~~~

A 400 means the caller should change the request before retrying it.

### 401 Unauthorized

Use HTTP 401 when authentication is missing, malformed, expired, or otherwise
invalid.

The authentication middleware already uses this for a missing Bearer header
and for an invalid or expired token:

~~~ts
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  res.status(401).json({
    error: 'Missing or invalid Authorization header',
  });
  return;
}
~~~

Do not use 401 merely because an authenticated user lacks permission. That is
a 403 response.

### 403 Forbidden

Use HTTP 403 when the caller is authenticated but is not allowed to perform the
operation on the requested resource.

Examples include:

- only a bounty claimant may submit work;
- only a bounty creator may approve or reject a submission;
- only an appropriate dispute participant may perform a protected action.

~~~ts
if (bounty.claimantId !== req.contributor.id) {
  res.status(403).json({
    error: 'Only the bounty claimant can submit work',
  });
  return;
}
~~~

When revealing whether a resource exists would leak cross-user information, an
endpoint may intentionally return 404 instead. Make that privacy choice
explicit and test it.

### 404 Not Found

Use HTTP 404 when the requested resource does not exist or is intentionally
hidden from the caller.

~~~ts
const bounty = await prisma.bounty.findUnique({ where: { id } });

if (!bounty) {
  res.status(404).json({ error: 'Bounty not found' });
  return;
}
~~~

Do not turn an absent record into a 500. A normal lookup that returns no record
is an expected request outcome.

### 409 Conflict

Use HTTP 409 when the request is valid in isolation but conflicts with the
current state of the resource or workflow.

ChainBounty is stateful, so lifecycle conflicts are the main use case:

- attempting to claim a bounty that is not OPEN;
- attempting to submit work for a bounty that is not CLAIMED;
- resolving a dispute that has already been resolved;
- attempting a transition that is valid only from another bounty state.

~~~ts
if (bounty.status !== 'OPEN') {
  res.status(409).json({
    error: 'Bounty cannot be claimed',
    detail: 'Only OPEN bounties can be claimed.',
  });
  return;
}
~~~

Prefer 409 over 400 when the same request could become valid after server-side
resource state changes.

### 500 Internal Server Error

Use HTTP 500 only for an unexpected failure that prevents the server from
completing an otherwise valid operation.

Controller catch blocks should log the real exception for operators and return
a safe public message:

~~~ts
try {
  const bounty = await prisma.bounty.findUnique({ where: { id } });
  // Expected 4xx checks and the normal success path go here.
} catch (error) {
  console.error('getBountyById error:', error);
  res.status(500).json({ error: 'Failed to fetch bounty' });
}
~~~

The global fallback in src/app.ts follows the same rule:

~~~json
{
  "error": "Internal server error"
}
~~~

Never expose the caught exception merely to make a 500 response more
descriptive. Operational detail belongs in server logs.

## Controller flow

Keep controller error handling in a predictable order:

1. Validate authentication if the route requires it.
2. Validate request fields and parameters.
3. Load the requested resource.
4. Check ownership or authorization.
5. Check lifecycle or state preconditions.
6. Perform the database mutation or query.
7. Return the success response.
8. Catch unexpected exceptions, log them, and return a safe 500.

Expected 4xx branches should return immediately after writing the response.
This prevents execution from continuing into database work after an error has
already been sent.

## Middleware and validation

Prefer shared validators or middleware when a rule applies to many routes.

The bounty validator already accumulates field errors and emits one response:

~~~json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "rewardAmount",
      "message": "Reward amount must be a positive number"
    }
  ]
}
~~~

This is preferable to inventing a new error shape in each controller.

The global Express error handler is the final safety net, not a substitute for
expected domain checks:

- malformed JSON is an expected 400;
- unknown routes are an expected 404;
- authorization and resource-state errors belong near the domain operation;
- uncaught exceptions fall through to the generic 500 handler.

## Logging unexpected failures

For an unexpected exception:

- log a short operation name plus the exception server-side;
- keep tokens, authorization headers, secrets, and sensitive request bodies out
  of logs;
- return a generic client-safe error;
- do not log the same exception repeatedly at multiple layers unless each log
  adds useful context.

Existing controllers use operation prefixes such as:

~~~ts
console.error('createDispute error:', error);
console.error('getBountyById error:', error);
~~~

If structured logging is introduced later, preserve the same separation between
operator-only exception detail and public API messages.

## Choosing between similar statuses

Use this decision order for common failures:

1. Authentication absent or invalid: use 401.
2. Request malformed or a field invalid: use 400.
3. Resource absent or intentionally hidden: use 404.
4. Authenticated caller lacks permission: use 403.
5. Valid operation conflicts with current resource state: use 409.
6. Unexpected server or dependency failure: use 500.

For a new endpoint, tests should cover the important error branches as well as
the success path. At minimum, test validation, not-found, authorization, and
state-conflict branches when those cases apply.

## Review checklist

Before merging a controller change, confirm:

- every error response contains an error string;
- field validation uses details with field and message;
- safe request-wide context uses detail, not raw exception data;
- expected failures use a specific 4xx status instead of 500;
- every response branch returns before execution continues;
- unexpected exceptions are logged server-side and return a safe 500;
- no secrets, stack traces, SQL, Prisma internals, or token values reach the
  client;
- tests assert both the status code and public response shape.
