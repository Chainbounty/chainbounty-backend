import { resolveBountyStatusFromLabels, isBountyStatusLabel } from '../src/lib/labelSync';

describe('Label Sync Logic', () => {
  describe('isBountyStatusLabel', () => {
    it('should recognize bounty status labels', () => {
      expect(isBountyStatusLabel('bounty:open')).toBe(true);
      expect(isBountyStatusLabel('bounty:claimed')).toBe(true);
      expect(isBountyStatusLabel('bounty:submitted')).toBe(true);
      expect(isBountyStatusLabel('bounty:approved')).toBe(true);
      expect(isBountyStatusLabel('bounty:rejected')).toBe(true);
      expect(isBountyStatusLabel('bounty:cancelled')).toBe(true);
      expect(isBountyStatusLabel('bounty:disputed')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isBountyStatusLabel('BOUNTY:OPEN')).toBe(true);
      expect(isBountyStatusLabel('Bounty:Claimed')).toBe(true);
    });

    it('should reject non-bounty labels', () => {
      expect(isBountyStatusLabel('bug')).toBe(false);
      expect(isBountyStatusLabel('enhancement')).toBe(false);
      expect(isBountyStatusLabel('good first issue')).toBe(false);
    });
  });

  describe('resolveBountyStatusFromLabels', () => {
    it('should return null for empty labels', () => {
      expect(resolveBountyStatusFromLabels([])).toBeNull();
    });

    it('should return null when no bounty labels present', () => {
      expect(resolveBountyStatusFromLabels(['bug', 'enhancement'])).toBeNull();
    });

    it('should resolve single bounty status label', () => {
      expect(resolveBountyStatusFromLabels(['bounty:open'])).toBe('OPEN');
      expect(resolveBountyStatusFromLabels(['bounty:claimed'])).toBe('CLAIMED');
      expect(resolveBountyStatusFromLabels(['bounty:approved'])).toBe('APPROVED');
    });

    it('should prioritize higher-priority status when multiple labels exist', () => {
      // APPROVED has highest priority
      expect(resolveBountyStatusFromLabels(['bounty:open', 'bounty:approved'])).toBe('APPROVED');

      // DISPUTED has higher priority than SUBMITTED
      expect(resolveBountyStatusFromLabels(['bounty:submitted', 'bounty:disputed'])).toBe(
        'DISPUTED',
      );

      // CLAIMED has higher priority than OPEN
      expect(resolveBountyStatusFromLabels(['bounty:open', 'bounty:claimed'])).toBe('CLAIMED');
    });

    it('should handle mixed case labels', () => {
      expect(resolveBountyStatusFromLabels(['BOUNTY:OPEN'])).toBe('OPEN');
      expect(resolveBountyStatusFromLabels(['Bounty:Claimed'])).toBe('CLAIMED');
    });

    it('should ignore non-bounty labels', () => {
      expect(resolveBountyStatusFromLabels(['bug', 'bounty:open', 'enhancement'])).toBe('OPEN');
    });

    it('should handle labels with extra whitespace', () => {
      expect(resolveBountyStatusFromLabels([' bounty:open '])).toBe('OPEN');
      expect(resolveBountyStatusFromLabels(['  bounty:claimed  '])).toBe('CLAIMED');
    });

    it('should resolve correct priority order', () => {
      // Test the full priority chain
      const allLabels = [
        'bounty:open',
        'bounty:claimed',
        'bounty:cancelled',
        'bounty:rejected',
        'bounty:submitted',
        'bounty:disputed',
        'bounty:approved',
      ];

      // APPROVED should win (highest priority)
      expect(resolveBountyStatusFromLabels(allLabels)).toBe('APPROVED');

      // Remove APPROVED, DISPUTED should win
      expect(
        resolveBountyStatusFromLabels(allLabels.filter((l) => l !== 'bounty:approved')),
      ).toBe('DISPUTED');

      // Remove APPROVED and DISPUTED, SUBMITTED should win
      expect(
        resolveBountyStatusFromLabels(
          allLabels.filter((l) => !['bounty:approved', 'bounty:disputed'].includes(l)),
        ),
      ).toBe('SUBMITTED');
    });
  });
});
