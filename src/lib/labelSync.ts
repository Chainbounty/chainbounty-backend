import type { BountyStatus } from '@prisma/client';

/**
 * Maps GitHub label names to BountyStatus values.
 * Labels are matched case-insensitively.
 *
 * Maintainers can control bounty lifecycle directly from GitHub
 * by adding these labels to issues:
 *
 *   bounty:open      → OPEN
 *   bounty:claimed   → CLAIMED
 *   bounty:submitted → SUBMITTED
 *   bounty:approved  → APPROVED
 *   bounty:rejected  → REJECTED
 *   bounty:cancelled → CANCELLED
 *   bounty:disputed  → DISPUTED
 */
const LABEL_TO_STATUS: Record<string, BountyStatus> = {
  'bounty:open': 'OPEN',
  'bounty:claimed': 'CLAIMED',
  'bounty:submitted': 'SUBMITTED',
  'bounty:approved': 'APPROVED',
  'bounty:rejected': 'REJECTED',
  'bounty:cancelled': 'CANCELLED',
  'bounty:disputed': 'DISPUTED',
};

/**
 * Resolves the intended BountyStatus from a list of GitHub label names.
 * Returns null if no bounty-status label is present.
 * If multiple bounty status labels exist, the one with highest priority wins.
 */
const STATUS_PRIORITY: BountyStatus[] = [
  'APPROVED',
  'DISPUTED',
  'SUBMITTED',
  'REJECTED',
  'CANCELLED',
  'CLAIMED',
  'OPEN',
];

export function resolveBountyStatusFromLabels(labelNames: string[]): BountyStatus | null {
  const normalised = labelNames.map((l) => l.toLowerCase().trim());

  const matched = normalised
    .map((l) => LABEL_TO_STATUS[l])
    .filter((s): s is BountyStatus => s !== undefined);

  if (matched.length === 0) return null;

  // Return the highest-priority status found
  for (const priority of STATUS_PRIORITY) {
    if (matched.includes(priority)) return priority;
  }

  return matched[0];
}

/**
 * Returns true if the label name is a recognised bounty-status label.
 */
export function isBountyStatusLabel(labelName: string): boolean {
  return labelName.toLowerCase().trim() in LABEL_TO_STATUS;
}
