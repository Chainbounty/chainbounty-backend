import { prisma } from '../src/lib/prisma';

// Clean up database before all tests
beforeAll(async () => {
  try {
    // Wait for database to be ready
    await prisma.$connect();
    
    // Delete all records in reverse dependency order
    await prisma.$transaction([
      prisma.platformFee.deleteMany({}),
      prisma.notification.deleteMany({}),
      prisma.webhookDelivery.deleteMany({}),
      prisma.dispute.deleteMany({}),
      prisma.submission.deleteMany({}),
      prisma.milestone.deleteMany({}),
      prisma.bounty.deleteMany({}),
      prisma.contributor.deleteMany({}),
    ]);
    
    console.log('✓ Database cleaned successfully');
  } catch (error) {
    console.error('⚠ Failed to clean up database:', error);
    // Don't throw - let tests run and fail individually if DB is not ready
  }
});

// Clean between test suites
afterEach(async () => {
  // Don't clean after every test, just after each suite
});

// Close database connection after all tests
afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
});
