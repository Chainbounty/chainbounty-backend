import express, { type Request, type Response, type NextFunction } from 'express';
import routes from './routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// Capture raw body for webhook signature verification before JSON parsing
app.use(
  (req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction): void => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });
    req.on('error', next);
  },
);

// JSON + form parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'chainbounty-backend',
    timestamp: new Date().toISOString(),
  });
});

// Webhook routes (before auth middleware that will come in step 15)
app.use('/webhooks', webhookRoutes);

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
