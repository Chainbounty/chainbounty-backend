import { Horizon } from '@stellar/stellar-sdk';
import { prisma } from './prisma';
import { syncPendingEvents } from './eventSync';
import type { IndexerState } from '../types/stellar';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const CONTRACT_ADDRESS = process.env.SOROBAN_CONTRACT_ADDRESS ?? '';
const POLL_INTERVAL_MS = parseInt(process.env.INDEXER_POLL_INTERVAL_MS ?? '15000', 10);

// In-memory cursor; persisted to DB via WebhookDelivery for replay
const indexerState: IndexerState = {
  lastPagingToken: null,
  lastIndexedAt: null,
};

let pollingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Builds a Horizon server instance pointed at the configured network.
 */
function getServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL, { allowHttp: HORIZON_URL.startsWith('http://') });
}

/**
 * Loads the last known paging token from the DB so we resume after a restart.
 */
async function loadCursor(): Promise<void> {
  const last = await prisma.webhookDelivery.findFirst({
    where: { source: 'stellar', eventType: 'stellar.cursor' },
    orderBy: { createdAt: 'desc' },
  });

  if (last?.payload && typeof last.payload === 'object') {
    const payload = last.payload as { pagingToken?: string };
    indexerState.lastPagingToken = payload.pagingToken ?? null;
  }
}

/**
 * Persists the current paging token so restarts resume cleanly.
 */
async function saveCursor(pagingToken: string): Promise<void> {
  await prisma.webhookDelivery.create({
    data: {
      eventType: 'stellar.cursor',
      payload: { pagingToken },
      source: 'stellar',
      processed: true,
      processedAt: new Date(),
    },
  });
  indexerState.lastPagingToken = pagingToken;
  indexerState.lastIndexedAt = new Date();
}

/**
 * Fetches recent operations for the contract account from Horizon
 * and stores raw events for the sync layer (step 13) to process.
 */
async function pollOperations(): Promise<void> {
  if (!CONTRACT_ADDRESS) {
    console.warn('[Indexer] SOROBAN_CONTRACT_ADDRESS not set — skipping poll');
    return;
  }

  try {
    const server = getServer();

    let builder = server.operations().forAccount(CONTRACT_ADDRESS).order('asc').limit(50);

    if (indexerState.lastPagingToken) {
      builder = builder.cursor(indexerState.lastPagingToken);
    }

    const page = await builder.call();
    const records = page.records;

    if (records.length === 0) {
      // No new operations, but still run event sync in case there's backlog
      await syncPendingEvents();
      return;
    }

    // Persist each operation as a raw WebhookDelivery for the event sync layer
    for (const op of records) {
      const alreadyStored = await prisma.webhookDelivery.findFirst({
        where: {
          source: 'stellar',
          eventType: `stellar.operation.${op.type}`,
        },
      });

      if (!alreadyStored) {
        await prisma.webhookDelivery.create({
          data: {
            eventType: `stellar.operation.${op.type}`,
            payload: op as unknown as object,
            source: 'stellar',
            processed: false,
          },
        });
      }

      // Advance cursor after each record
      await saveCursor(op.paging_token);
    }

    console.info(`[Indexer] Indexed ${records.length} Stellar operation(s)`);

    // Process pending events after indexing
    await syncPendingEvents();
  } catch (error) {
    console.error('[Indexer] Poll error:', error);
  }
}

/**
 * Starts the Horizon polling loop.
 */
export async function startIndexer(): Promise<void> {
  if (!CONTRACT_ADDRESS) {
    console.warn('[Indexer] SOROBAN_CONTRACT_ADDRESS not configured — indexer disabled');
    return;
  }

  await loadCursor();
  console.info(
    `[Indexer] Starting Horizon indexer | network: ${HORIZON_URL} | contract: ${CONTRACT_ADDRESS} | interval: ${POLL_INTERVAL_MS}ms`,
  );

  const tick = async (): Promise<void> => {
    await pollOperations();
    pollingTimer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
  };

  await tick();
}

/**
 * Stops the polling loop gracefully.
 */
export function stopIndexer(): void {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
    console.info('[Indexer] Stopped');
  }
}

export function getIndexerState(): IndexerState {
  return { ...indexerState };
}
