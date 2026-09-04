import { prisma } from './prisma';
import type { Decimal } from '@prisma/client/runtime/library';

const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE ?? '2.5'); // 2.5% default

/**
 * Calculates the platform fee for a bounty reward amount.
 */
export function calculatePlatformFee(rewardAmount: number | Decimal): number {
  const amount = typeof rewardAmount === 'number' ? rewardAmount : parseFloat(rewardAmount.toString());
  return (amount * PLATFORM_FEE_PERCENTAGE) / 100;
}

/**
 * Records a platform fee when a bounty is approved.
 */
export async function recordPlatformFee(
  bountyId: string,
  rewardAmount: number | Decimal,
  rewardAsset: string,
  txHash?: string,
): Promise<void> {
  const feeAmount = calculatePlatformFee(rewardAmount);

  await prisma.platformFee.create({
    data: {
      bountyId,
      amount: feeAmount,
      asset: rewardAsset,
      txHash: txHash ?? null,
      collected: !!txHash, // If txHash is provided, mark as collected
      collectedAt: txHash ? new Date() : null,
    },
  });

  // Update bounty with fee info
  await prisma.bounty.update({
    where: { id: bountyId },
    data: {
      platformFeeAmount: feeAmount,
      platformFeePaid: !!txHash,
    },
  });
}

/**
 * Marks a platform fee as collected when payment is confirmed on-chain.
 */
export async function markFeeAsCollected(feeId: string, txHash: string): Promise<void> {
  await prisma.platformFee.update({
    where: { id: feeId },
    data: {
      collected: true,
      collectedAt: new Date(),
      txHash,
    },
  });
}
