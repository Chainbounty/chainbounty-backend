import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChainBounty API',
      version: '1.0.0',
      description:
        'Decentralized bounty board API for open source projects. Integrates with GitHub and Stellar blockchain.',
      contact: {
        name: 'ChainBounty',
        url: 'https://github.com/chainbounty',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.chainbounty.io',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/v1/auth/verify endpoint',
        },
      },
      schemas: {
        Bounty: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cld5g3r7y0000356h9z8z4v9z' },
            title: { type: 'string', example: 'Fix login validation bug' },
            description: { type: 'string', example: 'The login form does not validate...' },
            rewardAmount: { type: 'string', example: '100' },
            rewardAsset: { type: 'string', example: 'XLM' },
            status: {
              type: 'string',
              enum: ['OPEN', 'CLAIMED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISPUTED'],
              example: 'OPEN',
            },
            difficulty: {
              type: 'string',
              enum: ['EASY', 'MEDIUM', 'HARD'],
              example: 'MEDIUM',
            },
            githubIssueUrl: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            creator: { $ref: '#/components/schemas/ContributorSummary' },
          },
        },
        ContributorSummary: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            stellarAddress: { type: 'string' },
            githubUsername: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        Contributor: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            stellarAddress: { type: 'string' },
            githubUsername: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            reputationScore: { type: 'integer', example: 100 },
            bountiesCompleted: { type: 'integer', example: 5 },
            totalEarned: { type: 'string', example: '500' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', example: 'BOUNTY_CLAIMED' },
            title: { type: 'string', example: 'Bounty Claimed' },
            body: { type: 'string', example: 'John claimed your bounty' },
            read: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'title' },
                  message: { type: 'string', example: 'Title is required' },
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Bounties', description: 'Bounty management' },
      { name: 'Contributors', description: 'Contributor profiles and leaderboard' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Disputes', description: 'Dispute management' },
      { name: 'Treasury', description: 'Platform fee tracking' },
      { name: 'Webhooks', description: 'External webhook receivers' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
