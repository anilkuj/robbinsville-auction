import { describe, it, expect } from 'vitest';
import { computeMaxBid } from './auction.js';

describe('Server Auction Logic', () => {
    describe('computeMaxBid', () => {
        it('should calculate correctly with a full squad', () => {
            // With squad size 18, current roster 18, min bid 1000, max bid should be exact budget
            const max = computeMaxBid(50000, 18, 18, 1000);
            expect(max).toBe(50000);
        });

        it('should reserve minBid for each required slot', () => {
            // With squad size 18, current roster 16 (needs 2 more players).
            // Max bid on current player = budget - ((required - 1) * minBid) -> budget - (1 * 1000)
            const max = computeMaxBid(50000, 16, 18, 1000);
            expect(max).toBe(49000);
        });

        it('should reserve correctly when needing many players', () => {
            const max = computeMaxBid(50000, 0, 18, 1000);
            expect(max).toBe(50000 - (17 * 1000)); // 33000
        });

        it('should handle over-full squads gracefully', () => {
            const max = computeMaxBid(50000, 20, 18, 1000);
            expect(max).toBe(50000);
        });
    });
});
