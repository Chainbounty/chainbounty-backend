import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import './setup';

describe('Bounty CRUD Endpoints', () => {
  let testContributor: { id: string; stellarAddress: string };
  let testBountyId: string;

  beforeAll(async () => {
    // Create a test contributor
    testContributor = await prisma.contributor.create({
      data: {
        stellarAddress: 'GTEST000000000000000000000000000000000000000000000000000',
        displayName: 'Test Contributor',
      },
    });

    // Create the DEV placeholder contributor that the bounty controllers use
    const DEV_STELLAR = 'GDEV0000000000000000000000000000000000000000000000000000';
    const devCreator = await prisma.contributor.upsert({
      where: { stellarAddress: DEV_STELLAR },
      update: {},
      create: { stellarAddress: DEV_STELLAR, displayName: 'Dev Placeholder' },
    });

    // Create a test bounty for use in tests that need an existing bounty
    // Use the DEV placeholder as creator so approve/reject will work
    const bounty = await prisma.bounty.create({
      data: {
        title: 'Test Bounty for ID-based tests',
        description: 'This bounty is used for GET/claim/submit/approve tests',
        rewardAmount: 100,
        creatorId: devCreator.id, // Use DEV placeholder so approve/reject tests work
        status: 'OPEN',
      },
    });
    testBountyId = bounty.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.bounty.deleteMany({});
      await prisma.contributor.deleteMany({});
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/v1/bounties', () => {
    it('should create a new bounty with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/bounties')
        .send({
          title: 'Fix login bug',
          description: 'The login form does not validate email addresses correctly',
          rewardAmount: 100,
          rewardAsset: 'XLM',
          difficulty: 'MEDIUM',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Fix login bug');
      expect(response.body.data.status).toBe('OPEN');
      expect(response.body.data.rewardAmount).toBe('100');
    });

    it('should reject bounty creation with missing title', async () => {
      const response = await request(app)
        .post('/api/v1/bounties')
        .send({
          description: 'Missing title',
          rewardAmount: 50,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
        ]),
      );
    });

    it('should reject bounty creation with negative reward', async () => {
      const response = await request(app)
        .post('/api/v1/bounties')
        .send({
          title: 'Test bounty',
          description: 'Invalid reward',
          rewardAmount: -10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should create bounty with milestones', async () => {
      const response = await request(app)
        .post('/api/v1/bounties')
        .send({
          title: 'Multi-milestone bounty',
          description: 'Test milestones',
          rewardAmount: 200,
          milestones: [
            { title: 'Phase 1', rewardPercent: 40 },
            { title: 'Phase 2', rewardPercent: 60 },
          ],
        })
        .expect(201);

      expect(response.body.data.milestones).toHaveLength(2);
      expect(response.body.data.milestones[0].rewardPercent).toBe(40);
    });
  });

  describe('GET /api/v1/bounties', () => {
    it('should list all bounties with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/bounties')
        .query({ limit: 10, page: 1 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter bounties by status', async () => {
      const response = await request(app)
        .get('/api/v1/bounties')
        .query({ status: 'OPEN' })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((bounty: { status: string }) => {
        expect(bounty.status).toBe('OPEN');
      });
    });

    it('should filter bounties by reward range', async () => {
      const response = await request(app)
        .get('/api/v1/bounties')
        .query({ minReward: 50, maxReward: 150 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((bounty: { rewardAmount: string }) => {
        const amount = parseFloat(bounty.rewardAmount);
        expect(amount).toBeGreaterThanOrEqual(50);
        expect(amount).toBeLessThanOrEqual(150);
      });
    });

    it('should reject invalid pagination parameters', async () => {
      await request(app)
        .get('/api/v1/bounties')
        .query({ limit: 200 })
        .expect(400);
    });
  });

  describe('GET /api/v1/bounties/:id', () => {
    it('should return a single bounty by ID', async () => {
      if (!testBountyId) {
        throw new Error('testBountyId is not set - beforeAll may have failed');
      }
      
      const response = await request(app)
        .get(`/api/v1/bounties/${testBountyId}`)
        .expect(200);

      expect(response.body.data.id).toBe(testBountyId);
      expect(response.body.data).toHaveProperty('creator');
      expect(response.body.data).toHaveProperty('milestones');
    });

    it('should return 404 for non-existent bounty', async () => {
      await request(app)
        .get('/api/v1/bounties/cnonexistent0000000000000')
        .expect(404);
    });
  });

  describe('POST /api/v1/bounties/:id/claim', () => {
    it('should claim an open bounty', async () => {
      if (!testBountyId) {
        throw new Error('testBountyId is not set - beforeAll may have failed');
      }
      
      const response = await request(app)
        .post(`/api/v1/bounties/${testBountyId}/claim`)
        .expect(200);

      expect(response.body.data.status).toBe('CLAIMED');
      expect(response.body.data.claimantId).toBeTruthy();
      expect(response.body.data.claimedAt).toBeTruthy();
    });

    it('should reject claiming an already claimed bounty', async () => {
      if (!testBountyId) {
        throw new Error('testBountyId is not set - beforeAll may have failed');
      }
      
      const response = await request(app)
        .post(`/api/v1/bounties/${testBountyId}/claim`)
        .expect(409);

      expect(response.body.error).toContain('cannot be claimed');
    });
  });

  describe('POST /api/v1/bounties/:id/submit', () => {
    it('should submit work for a claimed bounty', async () => {
      if (!testBountyId) {
        throw new Error('testBountyId is not set - beforeAll may have failed');
      }
      
      const response = await request(app)
        .post(`/api/v1/bounties/${testBountyId}/submit`)
        .send({
          description: 'Implemented the fix as requested',
          prUrl: 'https://github.com/test/repo/pull/123',
          notes: 'Please review the changes',
        })
        .expect(200);

      expect(response.body.data.bounty.status).toBe('SUBMITTED');
      expect(response.body.data.submission).toHaveProperty('description');
    });

    it('should reject submission without description', async () => {
      // Create and claim a new bounty for this test
      // Use the same claimant placeholder that the controller will use
      const DEV_CLAIMANT_STELLAR = 'GCLM0000000000000000000000000000000000000000000000000000';
      const claimant = await prisma.contributor.upsert({
        where: { stellarAddress: DEV_CLAIMANT_STELLAR },
        update: {},
        create: { stellarAddress: DEV_CLAIMANT_STELLAR, displayName: 'Claimant Placeholder' },
      });

      const bounty = await prisma.bounty.create({
        data: {
          title: 'Test submission validation',
          description: 'Test',
          rewardAmount: 50,
          creatorId: testContributor.id,
          status: 'CLAIMED',
          claimantId: claimant.id, // Use the same claimant as the controller
        },
      });

      await request(app)
        .post(`/api/v1/bounties/${bounty.id}/submit`)
        .send({ notes: 'No description' })
        .expect(400);
    });
  });

  describe('POST /api/v1/bounties/:id/approve', () => {
    it('should approve a submitted bounty', async () => {
      if (!testBountyId) {
        throw new Error('testBountyId is not set - beforeAll may have failed');
      }
      
      const response = await request(app)
        .post(`/api/v1/bounties/${testBountyId}/approve`)
        .send({
          reviewNotes: 'Great work!',
        })
        .expect(200);

      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.approvedAt).toBeTruthy();
    });
  });

  describe('POST /api/v1/bounties/:id/reject', () => {
    it('should reject a submitted bounty', async () => {
      // Create, claim, and submit a new bounty
      const bounty = await prisma.bounty.create({
        data: {
          title: 'Test rejection',
          description: 'Test',
          rewardAmount: 75,
          creatorId: testContributor.id,
          status: 'SUBMITTED',
          claimantId: testContributor.id,
        },
      });

      const response = await request(app)
        .post(`/api/v1/bounties/${bounty.id}/reject`)
        .send({
          reviewNotes: 'Needs more work on the tests',
        })
        .expect(200);

      expect(response.body.data.status).toBe('CLAIMED');
    });

    it('should reject without review notes', async () => {
      const bounty = await prisma.bounty.create({
        data: {
          title: 'Test rejection validation',
          description: 'Test',
          rewardAmount: 75,
          creatorId: testContributor.id,
          status: 'SUBMITTED',
          claimantId: testContributor.id,
        },
      });

      await request(app)
        .post(`/api/v1/bounties/${bounty.id}/reject`)
        .send({})
        .expect(400);
    });
  });
});
