import { prisma } from './prisma';
import type { ContractEvent } from '../types/stellar';

/**
 * Processes unprocessed Stellar operations stored by the indexer
 * and syncs relevant contract events to the bounty database.
 */
export async function syncPendingEvents(): Promise<void> {
  const pending = await prisma.webhookDelivery.findMany({
    where: {
      source: 'stellar',
      processed: false,
      eventType: { not: 'stellar.cursor' },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  for (const delivery of pending) {
    try {
      await processOperation(delivery.id, delivery.payload as Record<string, unknown>);

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { processed: true, processedAt: new Date() },
      });
    } catch (error) {
      console.error(`[EventSync] Failed to process delivery ${delivery.id}:`, error);

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { error: String(error) },
      });
    }
  }

  if (pending.length > 0) {
    console.info(`[EventSync] Synced ${pending.length} Stellar event(s)`);
  }
}

async function processOperation(
  deliveryId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const opType = payload.type as string;

  // We only care about invoke_host_function (Soroban contract calls)
  if (opType !== 'invoke_host_function') return;

  // In a real implementation, you'd parse contract events from the operation
  // or fetch the transaction receipt. Here's a stub that shows the pattern:

  // Example: parse contract events from the operation metadata
  const events = parseContractEvents(payload);

  for (const event of events) {
    await handleContractEvent(event);
  }
}

/**
 * Stub: In production, parse events from Horizon operation or tx result.
 * For now, we return an empty array as placeholder.
 */
function parseContractEvents(_payload: Record<string, unknown>): ContractEvent[] {
  // Real implementation would decode xdr from payload.result_xdr or similar
  // and extract Soroban contract events matching our escrow contract topics.
  return [];
}

/**
 * Dispatches a contract event to the appropriate handler.
 */
async function handleContractEvent(event: ContractEvent): Promise<void> {
  switch (event.type) {
    case 'bounty_escrowed':
      await handleBountyEscrowed(event.data);
      break;
    case 'bounty_claimed':
      await handleBountyClaimed(event.data);
      break;
    case 'bounty_released':
      await handleBountyReleased(event.data);
      break;
    case 'bounty_disputed':
      await handleBountyDisputed(event.data);
      break;
  }
}

async function handleBountyEscrowed(data: {
  bounty_id: string;
  creator: string;
  amount: string;
  asset: string;
}): Promise<void> {
  const bounty = await prisma.bounty.findUnique({ where: { id: data.bounty_id } });
  if (!bounty) {
    console.warn(`[EventSync] Bounty ${data.bounty_id} not found for escrow event`);
    return;
  }

  await prisma.bounty.update({
    where: { id: data.bounty_id },
    data: {
      contractAddress: data.creator,
      // Store the escrow tx hash if available (would come from payload)
    },
  });

  console.info(`[EventSync] Bounty ${data.bounty_id} escrowed: ${data.amount} ${data.asset}`);
}

async function handleBountyClaimed(data: { bounty_id: string; claimant: string }): Promise<void> {
  const bounty = await prisma.bounty.findUnique({ where: { id: data.bounty_id } });
  if (!bounty) {
    console.warn(`[EventSync] Bounty ${data.bounty_id} not found for claim event`);
    return;
  }

  // Find or create contributor by Stellar address
  const contributor = await prisma.contributor.upsert({
    where: { stellarAddress: data.claimant },
    update: {},
    create: { stellarAddress: data.claimant },
  });

  await prisma.bounty.update({
    where: { id: data.bounty_id },
    data: {
      status: 'CLAIMED',
      claimantId: contributor.id,
      claimedAt: new Date(),
    },
  });

  console.info(`[EventSync] Bounty ${data.bounty_id} claimed by ${data.claimant}`);
}

async function handleBountyReleased(data: {
  bounty_id: string;
  claimant: string;
  amount: string;
}): Promise<void> {
  const bounty = await prisma.bounty.findUnique({ where: { id: data.bounty_id } });
  if (!bounty) {
    console.warn(`[EventSync] Bounty ${data.bounty_id} not found for release event`);
    return;
  }

  await prisma.bounty.update({
    where: { id: data.bounty_id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      // Store release tx hash if available
    },
  });

  // Update claimant stats
  if (bounty.claimantId) {
    await prisma.contributor.update({
      where: { id: bounty.claimantId },
      data: {
        bountiesCompleted: { increment: 1 },
        totalEarned: { increment: bounty.rewardAmount },
        reputationScore: { increment: 10 },
      },
    });
  }

  console.info(`[EventSync] Bounty ${data.bounty_id} released: ${data.amount}`);
}

async function handleBountyDisputed(data: {
  bounty_id: string;
  disputer: string;
  reason: string;
}): Promise<void> {
  const bounty = await prisma.bounty.findUnique({ where: { id: data.bounty_id } });
  if (!bounty) {
    console.warn(`[EventSync] Bounty ${data.bounty_id} not found for dispute event`);
    return;
  }

  const contributor = await prisma.contributor.upsert({
    where: { stellarAddress: data.disputer },
    update: {},
    create: { stellarAddress: data.disputer },
  });

  await prisma.bounty.update({
    where: { id: data.bounty_id },
    data: { status: 'DISPUTED' },
  });

  await prisma.dispute.create({
    data: {
      bountyId: data.bounty_id,
      raisedById: contributor.id,
      reason: data.reason,
    },
  });

  console.info(`[EventSync] Bounty ${data.bounty_id} disputed by ${data.disputer}`);
}
