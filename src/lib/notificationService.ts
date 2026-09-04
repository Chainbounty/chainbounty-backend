import { prisma } from './prisma';
import type { NotificationPayload } from '../types/notification';

/**
 * Creates a notification and optionally delivers it via webhook.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId: payload.recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ? (payload.metadata as object) : undefined,
      },
    });

    console.info(`[Notification] Created ${payload.type} for contributor ${payload.recipientId}`);

    // Optionally deliver via webhook if recipient has a webhook URL configured
    await deliverWebhook(notification.id, payload);
  } catch (error) {
    console.error('[Notification] Failed to create notification:', error);
  }
}

/**
 * Delivers a notification via HTTP webhook to external services.
 * In production, you'd fetch the recipient's webhook URL from their profile settings.
 */
async function deliverWebhook(notificationId: string, payload: NotificationPayload): Promise<void> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;

  if (!webhookUrl) {
    // No webhook configured — skip delivery
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Notification-Type': payload.type,
      },
      body: JSON.stringify({
        notificationId,
        type: payload.type,
        recipientId: payload.recipientId,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata,
        timestamp: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { deliveredAt: new Date() },
      });
      console.info(`[Notification] Webhook delivered for ${notificationId}`);
    } else {
      console.error(
        `[Notification] Webhook delivery failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error('[Notification] Webhook delivery error:', error);
  }
}

/**
 * Helper functions to send common notification types.
 */
export async function notifyBountyClaimed(
  bountyId: string,
  bountyTitle: string,
  creatorId: string,
  claimantName: string,
): Promise<void> {
  await createNotification({
    type: 'BOUNTY_CLAIMED',
    recipientId: creatorId,
    title: 'Bounty Claimed',
    body: `${claimantName} has claimed your bounty: ${bountyTitle}`,
    metadata: { bountyId },
  });
}

export async function notifyBountySubmitted(
  bountyId: string,
  bountyTitle: string,
  creatorId: string,
  claimantName: string,
): Promise<void> {
  await createNotification({
    type: 'BOUNTY_SUBMITTED',
    recipientId: creatorId,
    title: 'Work Submitted',
    body: `${claimantName} has submitted work for: ${bountyTitle}`,
    metadata: { bountyId },
  });
}

export async function notifyBountyApproved(
  bountyId: string,
  bountyTitle: string,
  claimantId: string,
  rewardAmount: string,
): Promise<void> {
  await createNotification({
    type: 'BOUNTY_APPROVED',
    recipientId: claimantId,
    title: 'Bounty Approved! 🎉',
    body: `Your submission for "${bountyTitle}" has been approved! You earned ${rewardAmount}.`,
    metadata: { bountyId },
  });
}

export async function notifyBountyRejected(
  bountyId: string,
  bountyTitle: string,
  claimantId: string,
  reviewNotes?: string,
): Promise<void> {
  await createNotification({
    type: 'BOUNTY_REJECTED',
    recipientId: claimantId,
    title: 'Submission Needs Revision',
    body: `Your submission for "${bountyTitle}" needs changes. ${reviewNotes ? `Feedback: ${reviewNotes}` : ''}`,
    metadata: { bountyId },
  });
}

export async function notifyBountyDisputed(
  bountyId: string,
  bountyTitle: string,
  creatorId: string,
  disputerName: string,
): Promise<void> {
  await createNotification({
    type: 'BOUNTY_DISPUTED',
    recipientId: creatorId,
    title: 'Bounty Disputed',
    body: `${disputerName} has raised a dispute for: ${bountyTitle}`,
    metadata: { bountyId },
  });
}
