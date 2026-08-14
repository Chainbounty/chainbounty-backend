import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.info(`🚀 ChainBounty backend running on port ${PORT}`);
  console.info(`   Health check: http://localhost:${PORT}/health`);
});
