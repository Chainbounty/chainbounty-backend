# Test Timeout Fixes

## Problem
Integration tests (17 tests in `bounty.test.ts` and `webhook.test.ts`) were timing out in CI, while unit tests (30 tests) were passing successfully.

## Root Causes Identified

### 1. Express Middleware Body Parsing Issue
The app had a custom middleware that listened to request body streams (`req.on('data')`, `req.on('end')`) to capture raw body for webhook signature verification. This middleware was applied globally to ALL routes, causing conflicts with `supertest` which expects to handle body parsing itself.

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
app.use(express.json({ 
  limit: '1mb',
  verify: (req, _res, buf, _encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf;
    }
  }
}));
```

### 2. Improper Test Cleanup Order
Tests were closing the server after cleaning up database records, which could cause pending database operations to fail.

**Before:**
```typescript
afterAll(async () => {
  // Clean up test data first
  await prisma.bounty.deleteMany({});
  // Then close server
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

**After:**
```typescript
afterAll(async () => {
  // Close server FIRST to stop accepting new requests
  if (server) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server close timeout')), 5000);
      server.close((err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve(undefined);
      });
    }).catch(err => console.error('Server close error:', err));
  }
  
  // THEN clean up test data
  await prisma.bounty.deleteMany({});
  await prisma.contributor.deleteMany({});
});
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

## Changes Made

### Files Modified:
1. **src/app.ts** - Fixed middleware to use `express.json` verify callback
2. **tests/bounty.test.ts** - Added proper server close with timeout handling
3. **tests/webhook.test.ts** - Added proper server close with timeout handling  
4. **tests/setup.ts** - Added delay before disconnect, removed unused `afterEach`

## Expected Results

With these fixes:
- ✅ Integration tests should complete without timeouts
- ✅ Server connections properly closed after tests
- ✅ Database operations properly cleaned up
- ✅ All 47 tests (30 unit + 17 integration) should pass in CI

## Testing

The changes have been committed and pushed. Monitor the CI workflow at:
https://github.com/Chainbounty/chainbounty-backend/actions

Look for:
- All test suites passing (5 total: bounty, webhook, auth, labelSync, platformFee)
- No timeout errors
- Clean test execution with proper cleanup
