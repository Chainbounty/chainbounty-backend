import { prisma } from '../src/lib/prisma';

// Clean up database before each test suite
beforeAll(async () => {
  try {
    // Wait for database to be ready
    await prisma.$connect();
    
    // Delete all records in reverse dependency order
    await prisma.platformFee.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.webhookDelivery.deleteMany({});
    await prisma.dispute.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.milestone.deleteMany({});
    await prisma.bounty.deleteMany({});
    await prisma.contributor.deleteMany({});
    
    console.log('✓ Database cleaned successfully');
  } catch (error) {
    console.error('⚠ Failed to clean up database:', error);
    // Don't throw - let tests run and fail individually if DB is not ready
  }
});

// Close database connection after all tests
afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
});
