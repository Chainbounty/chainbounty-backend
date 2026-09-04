import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import type { GitHubIssueEvent } from '../src/types/github';
import './setup';

describe('GitHub Webhook Handler', () => {
  const WEBHOOK_SECRET = 'test-webhook-secret';
  let testBounty: {
    id: string;
    githubIssueUrl: string | null;
    githubIssueNumber: number | null;
  };
  let testContributor: { id: string };

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;

    testContributor = await prisma.contributor.create({
      data: {
        stellarAddress: 'GWEBHOOK00000000000000000000000000000000000000000000000',
        displayName: 'Webhook Test User',
      },
    });

    testBounty = await prisma.bounty.create({
      data: {
        title: 'Test GitHub Issue',
        description: 'A bounty linked to a GitHub issue',
        rewardAmount: 100,
        creatorId: testContributor.id,
        githubIssueUrl: 'https://github.com/test/repo/issues/123',
        githubIssueNumber: 123,
        githubRepoOwner: 'test',
        githubRepoName: 'repo',
        status: 'OPEN',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order (children before parents)
    try {
      // Delete child records first
      await prisma.webhookDelivery.deleteMany({});
      await prisma.milestone.deleteMany({});
      await prisma.submission.deleteMany({});
      await prisma.dispute.deleteMany({});
      
      // Then delete parent records
      await prisma.bounty.deleteMany({});
      await prisma.contributor.deleteMany({});
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  function signPayload(payload: string): string {
    return `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex')}`;
  }

  describe('POST /webhooks/github', () => {
    it('should accept a valid GitHub issue webhook', async () => {
      const payload: GitHubIssueEvent = {
        action: 'opened',
        issue: {
          id: 456,
          number: 456,
          title: 'New issue',
          body: 'Issue description',
          state: 'open',
          html_url: 'https://github.com/test/repo/issues/456',
          user: {
            login: 'testuser',
            id: 789,
            avatar_url: 'https://example.com/avatar.png',
            html_url: 'https://github.com/testuser',
          },
          labels: [],
          assignee: null,
          assignees: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          closed_at: null,
        },
        repository: {
          id: 999,
          name: 'repo',
          full_name: 'test/repo',
          owner: {
            login: 'test',
            id: 888,
            avatar_url: 'https://example.com/org.png',
            html_url: 'https://github.com/test',
          },
          html_url: 'https://github.com/test/repo',
          private: false,
        },
        sender: {
          login: 'testuser',
          id: 789,
          avatar_url: 'https://example.com/avatar.png',
          html_url: 'https://github.com/testuser',
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await request(app)
        .post('/webhooks/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'issues')
        .set('X-GitHub-Delivery', 'test-delivery-123')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);

      expect(response.body.message).toBe('Webhook processed');
      expect(response.body.action).toBe('opened');

      // Check that webhook delivery was stored
      const delivery = await prisma.webhookDelivery.findFirst({
        where: { eventType: 'github.issues.opened' },
        orderBy: { createdAt: 'desc' },
      });
      expect(delivery).toBeTruthy();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        action: 'opened',
        issue: { number: 1 },
        repository: { full_name: 'test/repo' },
      };

      await request(app)
        .post('/webhooks/github')
        .set('X-Hub-Signature-256', 'sha256=invalidsignature')
        .set('X-GitHub-Event', 'issues')
        .send(payload)
        .expect(401);
    });

    it('should update bounty when issue is closed', async () => {
      const payload: Partial<GitHubIssueEvent> = {
        action: 'closed',
        issue: {
          html_url: testBounty.githubIssueUrl!,
          number: testBounty.githubIssueNumber!,
          labels: [],
        } as unknown as GitHubIssueEvent['issue'],
        repository: {
          owner: { login: 'test' },
          name: 'repo',
        } as unknown as GitHubIssueEvent['repository'],
      };

      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      await request(app)
        .post('/webhooks/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'issues')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);

      const updated = await prisma.bounty.findUnique({ where: { id: testBounty.id } });
      expect(updated?.status).toBe('CANCELLED');
    });

    it('should update bounty labels when issue is labeled', async () => {
      // First reopen the bounty
      await prisma.bounty.update({
        where: { id: testBounty.id },
        data: { status: 'OPEN' },
      });

      const payload: Partial<GitHubIssueEvent> = {
        action: 'labeled',
        issue: {
          html_url: testBounty.githubIssueUrl!,
          number: testBounty.githubIssueNumber!,
          labels: [
            { id: 1, name: 'bounty:open', color: 'green' },
            { id: 2, name: 'good first issue', color: 'blue' },
          ],
        } as unknown as GitHubIssueEvent['issue'],
        repository: {
          owner: { login: 'test' },
          name: 'repo',
        } as unknown as GitHubIssueEvent['repository'],
        label: { id: 2, name: 'good first issue', color: 'blue' },
      };

      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      await request(app)
        .post('/webhooks/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'issues')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);

      const updated = await prisma.bounty.findUnique({ where: { id: testBounty.id } });
      expect(updated?.githubLabels).toContain('bounty:open');
      expect(updated?.githubLabels).toContain('good first issue');
    });

    it('should ignore non-issue events', async () => {
      const payload = { action: 'created' };
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await request(app)
        .post('/webhooks/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);

      expect(response.body.message).toContain('ignored');
    });
  });
});
