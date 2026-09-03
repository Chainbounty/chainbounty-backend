export type NotificationType =
  | 'BOUNTY_CREATED'
  | 'BOUNTY_CLAIMED'
  | 'BOUNTY_SUBMITTED'
  | 'BOUNTY_APPROVED'
  | 'BOUNTY_REJECTED'
  | 'BOUNTY_DISPUTED'
  | 'BOUNTY_EXPIRED'
  | 'SUBMISSION_REVIEWED'
  | 'DISPUTE_RESOLVED';

export interface NotificationPayload {
  type: NotificationType;
  recipientId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookDeliveryConfig {
  url: string;
  secret?: string;
  retryCount?: number;
  timeout?: number;
}
