import { describe, it, expect } from 'vitest';
import {
  checkVenueCompliance,
  checkFeatureCompliance,
  checkInstrumentCompliance,
  checkLeverageCompliance,
  validateTradeCompliance,
  formatReturnWithDisclaimer,
  COMPLIANCE_POLICIES,
} from './complianceEnforcement';

describe('Compliance Enforcement', () => {
  describe('checkVenueCompliance', () => {
    it('should allow Coinbase in US mode', () => {
      const result = checkVenueCompliance('us', 'coinbase');
      expect(result.allowed).toBe(true);
    });

    it('should block Binance in US mode', () => {
      const result = checkVenueCompliance('us', 'binance');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('regulatory');
    });

    it('should allow Binance in international mode', () => {
      const result = checkVenueCompliance('international', 'binance');
      expect(result.allowed).toBe(true);
    });

    it('should block Hyperliquid in US mode', () => {
      const result = checkVenueCompliance('us', 'hyperliquid');
      expect(result.allowed).toBe(false);
    });

    it('should include audit event on block', () => {
      const result = checkVenueCompliance('us', 'bybit');
      expect(result.auditEvent).toBeDefined();
      expect(result.auditEvent?.type).toBe('compliance_block');
      expect(result.auditEvent?.action).toBe('venue_access');
    });
  });

  describe('checkFeatureCompliance', () => {
    it('should allow spot in US mode', () => {
      const result = checkFeatureCompliance('us', 'spot');
      expect(result.allowed).toBe(true);
    });

    it('should block perpetuals in US mode', () => {
      const result = checkFeatureCompliance('us', 'perpetuals');
      expect(result.allowed).toBe(false);
    });

    it('should allow perpetuals in international mode', () => {
      const result = checkFeatureCompliance('international', 'perpetuals');
      expect(result.allowed).toBe(true);
    });

    it('should block options in US mode', () => {
      const result = checkFeatureCompliance('us', 'options');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkInstrumentCompliance', () => {
    it('should allow BTC-USDT spot in US mode', () => {
      const result = checkInstrumentCompliance('us', 'BTC-USDT');
      expect(result.allowed).toBe(true);
    });

    it('should block PERP instrument in US mode', () => {
      const result = checkInstrumentCompliance('us', 'BTC-USDT-PERP');
      expect(result.allowed).toBe(false);
    });

    it('should allow PERP in international mode', () => {
      const result = checkInstrumentCompliance('international', 'BTC-USDT-PERP');
      expect(result.allowed).toBe(true);
    });

    it('should block SWAP in US mode', () => {
      const result = checkInstrumentCompliance('us', 'BTC-USD-SWAP');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkLeverageCompliance', () => {
    it('should allow 5x in US mode', () => {
      const result = checkLeverageCompliance('us', 5);
      expect(result.allowed).toBe(true);
    });

    it('should block 10x in US mode', () => {
      const result = checkLeverageCompliance('us', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should allow 125x in international mode', () => {
      const result = checkLeverageCompliance('international', 125);
      expect(result.allowed).toBe(true);
    });

    it('should block 126x even in international mode', () => {
      const result = checkLeverageCompliance('international', 126);
      expect(result.allowed).toBe(false);
    });
  });

  describe('validateTradeCompliance', () => {
    it('should pass valid US trade', () => {
      const result = validateTradeCompliance({
        mode: 'us',
        venue: 'coinbase',
        instrument: 'BTC-USDT',
        leverage: 1,
      });
      expect(result.allowed).toBe(true);
    });

    it('should block US trade on blocked venue', () => {
      const result = validateTradeCompliance({
        mode: 'us',
        venue: 'binance',
        instrument: 'BTC-USDT',
      });
      expect(result.allowed).toBe(false);
    });

    it('should block US trade with perp instrument', () => {
      const result = validateTradeCompliance({
        mode: 'us',
        venue: 'coinbase',
        instrument: 'BTC-USDT-PERP',
      });
      expect(result.allowed).toBe(false);
    });

    it('should block US trade with excessive leverage', () => {
      const result = validateTradeCompliance({
        mode: 'us',
        venue: 'coinbase',
        instrument: 'BTC-USDT',
        leverage: 10,
      });
      expect(result.allowed).toBe(false);
    });

    it('should pass international trade with full features', () => {
      const result = validateTradeCompliance({
        mode: 'international',
        venue: 'binance',
        instrument: 'BTC-USDT-PERP',
        leverage: 20,
        isPerp: true,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('formatReturnWithDisclaimer', () => {
    it('should append asterisk to display value', () => {
      const result = formatReturnWithDisclaimer('10-15%');
      expect(result.display).toBe('10-15%*');
    });

    it('should include disclaimer text', () => {
      const result = formatReturnWithDisclaimer('5%');
      expect(result.disclaimer).toContain('backtested');
    });
  });

  describe('COMPLIANCE_POLICIES', () => {
    it('should have stricter US policy', () => {
      expect(COMPLIANCE_POLICIES.us.maxLeverage).toBeLessThan(COMPLIANCE_POLICIES.international.maxLeverage);
    });

    it('should have blocked venues for US', () => {
      expect(COMPLIANCE_POLICIES.us.blockedVenues.length).toBeGreaterThan(0);
    });

    it('should have no blocked venues for international', () => {
      expect(COMPLIANCE_POLICIES.international.blockedVenues).toHaveLength(0);
    });
  });
});
