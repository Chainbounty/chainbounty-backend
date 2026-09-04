# Debugging Notes - Test Failures

## Current Status
- **42 tests passing** (all unit tests + some integration tests)
- **5 tests failing** (consistently the same 5)
- **Test suite**: bounty.test.ts appears to be the source

## Issues Fixed So Far

### 1. Manual Server Creation
- Tests were calling `app.listen()` but supertest handles this automatically
- Fixed by removing manual server creation

### 2. Express Middleware Body Parsing  
- Custom body-reading middleware was blocking supertest
- Fixed by using `express.json({ verify: ... })` callback

### 3. Webhook Signature Verification
- Tests were signing one JSON string but sending a different one
- Fixed by sending the pre-stringified payload

### 4. Test Data Dependency
- Tests relied on `testBountyId` being set by first test
- Fixed by creating test bounty in `beforeAll()`

### 5. Placeholder ID Mismatches
- Controllers use hardcoded placeholders (DEV_STELLAR, DEV_CLAIMANT_STELLAR)
- Tests were using testContributor IDs
- Fixed by creating test bounty with correct placeholder IDs

## Current Theory

The 5 failing tests are likely the ones that use `testBountyId` and depend on sequential execution:

1. GET /api/v1/bounties/:id - "should return a single bounty by ID"
2. POST /:id/claim - "should claim an open bounty"
3. POST /:id/claim - "should reject claiming an already claimed bounty"  
4. POST /:id/submit - "should submit work for a claimed bounty"
5. POST /:id/approve - "should approve a submitted bounty"

These tests:
- All depend on `testBountyId` existing
- Modify the same bounty through its lifecycle
- Must run in order (OPEN → CLAIMED → SUBMITTED → APPROVED)

## Possible Root Causes

### Option A: testBountyId is undefined
- `beforeAll()` fails silently
- `testBountyId` remains undefined
- All 5 tests fail because they're hitting `/api/v1/bounties/undefined`

**Latest Fix**: Added explicit checks that throw clear errors if `testBountyId` is undefined

### Option B: Placeholder contributor creation fails in CI
- CI database might have different state
- `prisma.contributor.upsert()` might be failing
- Bounty creation succeeds but with wrong creator ID

### Option C: Test execution order issue
- Despite `maxWorkers: 1`, tests might not run in order
- State mutations don't carry over between tests
- Test #3 expects CLAIMED but gets OPEN

### Option D: Database transaction/isolation issue
- Tests run in transaction that gets rolled back
- Or isolation level causes tests to see stale data
- Mutations in one test don't persist to next test

## Debug Strategy

1. ✅ Added `--verbose` flag to CI for more detailed output
2. ✅ Added explicit `testBountyId` checks with clear error messages
3. ⏳ Waiting for next CI run to see specific error messages
4. Next: Based on errors, either:
   - Fix database setup
   - Restructure tests to be independent
   - Add more explicit state verification

## Test Structure Analysis

### Tests that DON'T use testBountyId (should pass):
- POST /api/v1/bounties (4 tests) ✅
- GET /api/v1/bounties list (4 tests) ✅  
- POST /:id/submit validation (1 test) ✅
- POST /:id/reject (2 tests) ✅
- All webhook tests (5 tests) ✅
- All unit tests (30 tests) ✅

**Total: 46 tests should pass**

### Tests that DO use testBountyId:
- GET /api/v1/bounties/:id (2 tests)
  - "should return a single bounty by ID" ❌?
  - "should return 404 for non-existent bounty" ✅ (doesn't use testBountyId)
- POST /:id/claim (2 tests)
  - "should claim an open bounty" ❌?
  - "should reject claiming already claimed" ❌?
- POST /:id/submit (1 test using testBountyId)
  - "should submit work for a claimed bounty" ❌?
- POST /:id/approve (1 test)
  - "should approve a submitted bounty" ❌?

**Total: 5 tests that might fail**

This matches our observed failures: 42 passing, 5 failing.

## Next Actions

1. Check CI output for new error messages from explicit checks
2. If "testBountyId is not set", debug `beforeAll()` setup
3. If different error, adjust strategy based on actual failure mode
4. Consider restructuring tests to be fully independent if needed
