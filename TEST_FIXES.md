# Test Timeout Fixes

## Problem
Integration tests (17 tests in `bounty.test.ts` and `webhook.test.ts`) were timing out in CI, while unit tests (30 tests) were passing successfully.

## Root Causes Identified

### 1. Manual Server Creation in Tests (Primary Issue)
The test files were manually starting HTTP servers using `app.listen(0)`, but `supertest` automatically handles server lifecycle when you pass it an Express app. This was causing:
- Port conflicts between test suites
- Hanging connections that needed explicit cleanup
- Unnecessary complexity in test setup/teardown

**Before:**
```typescript
let server: any;

beforeAll(async () => {
  server = app.listen(0); // Unnecessary - supertest handles this!
  // ... test setup
});

afterAll(async () => {
  // Complex server close logic needed
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => { /* ... */ });
    });
  }
});

// Tests still use request(app) which creates its own server
await request(app).get('/api/v1/bounties');
```

**After:**
```typescript
// No server variable needed at all!

beforeAll(async () => {
  // Just test data setup
  await prisma.contributor.create({ /* ... */ });
});

afterAll(async () => {
  // Just test data cleanup
  await prisma.bounty.deleteMany({});
  await prisma.contributor.deleteMany({});
});

// Supertest handles server lifecycle automatically
await request(app).get('/api/v1/bounties');
```

### 2. Express Middleware Body Parsing Issue
The app had a custom middleware that listened to request body streams (`req.on('data')`, `req.on('end')`) to capture raw body for webhook signature verification. This middleware was applied globally to ALL routes, causing conflicts with `supertest` which handles body parsing itself.

**Before:**
```typescript
// This runs for ALL requests, blocking body parsing
app.use((req, _res, next) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', next);
});
app.use(express.json({ limit: '1mb' }));
```

**After:**
```typescript
// Use express.json verify callback to capture raw body
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf, _encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf;
      }
    },
  }),
);
```

### 3. Prisma Disconnect Timing
The global test setup was disconnecting from Prisma immediately after tests completed, potentially interrupting pending operations.

**Before:**
```typescript
afterAll(async () => {
  await prisma.$disconnect();
});
```

**After:**
```typescript
afterAll(async () => {
  // Give time for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  await prisma.$disconnect();
});
```

### 4. Prettier Formatting
The middleware code wasn't following the project's Prettier formatting rules, causing linting failures in CI.

## Changes Made

### Files Modified:
1. **src/app.ts**
   - Replaced custom body-reading middleware with `express.json` verify callback
   - Fixed Prettier formatting (multi-line function parameters)

2. **tests/bounty.test.ts**
   - Removed manual `app.listen()` and server variable
   - Simplified `beforeAll` and `afterAll` hooks
   - Let supertest handle server lifecycle

3. **tests/webhook.test.ts**
   - Removed manual `app.listen()` and server variable
   - Simplified `beforeAll` and `afterAll` hooks
   - Let supertest handle server lifecycle

4. **tests/setup.ts**
   - Added 500ms delay before `prisma.$disconnect()`
   - Removed unused `afterEach` hook

## Expected Results

With these fixes:
- ✅ No port conflicts between test suites
- ✅ No hanging server connections
- ✅ Proper body parsing for all requests
- ✅ Clean database disconnection
- ✅ Linting passes in CI
- ✅ All 47 tests (30 unit + 17 integration) should pass in CI

## Key Insight

**When using supertest, NEVER manually start the server!**

Supertest's `request(app)` function handles the entire server lifecycle:
- Starts a server on an ephemeral port
- Makes the HTTP request
- Closes the server automatically
- Returns the response

Manual server creation with `app.listen()` creates conflicts because you end up with two servers - one that supertest creates internally and one you created manually.

## Testing

The changes have been committed and pushed to:
https://github.com/Chainbounty/chainbounty-backend

Monitor the CI workflow at:
https://github.com/Chainbounty/chainbounty-backend/actions

Expected CI results:
- ✅ Lint job passes
- ✅ Test job passes with all 47 tests
- ✅ Build job passes
- ✅ No timeout errors
- ✅ Clean execution logs
