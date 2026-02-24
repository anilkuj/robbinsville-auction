import { describe, it, expect } from 'vitest';
import { computeMaxBid } from '../utils/budgetCalc.js';

describe('Client Budget Calculation', () => {
    describe('computeMaxBid', () => {
        it('should calculate correctly with a full squad', () => {
            const max = computeMaxBid(50000, 18, 18, 1000);
            expect(max).toBe(50000);
        });

        it('should reserve minBid for each required slot', () => {
            const max = computeMaxBid(50000, 16, 18, 1000);
            expect(max).toBe(49000);
        });

        it('should match the server calculation exactly', () => {
            // This ensures we do not have a client/server mismatch
            expect(computeMaxBid(50000, 5, 18, 1000)).toBe(50000 - (12 * 1000));
        });
    });
});
