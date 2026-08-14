import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ?? 3000;

console.info(`ChainBounty backend starting on port ${PORT}...`);
