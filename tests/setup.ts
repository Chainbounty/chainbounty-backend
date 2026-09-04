import { prisma } from '../src/lib/prisma';

// Clean up database before each test suite
beforeAll(async () => {
  try {
    // Delete all records in reverse dependency order
    await prisma.platformFee.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.webhookDelivery.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.bounty.deleteMany();
    await prisma.contributor.deleteMany();
  } catch (error) {
    console.error('Failed to clean up database:', error);
    throw error;
  }
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
