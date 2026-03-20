import { describe, it, expect } from 'vitest';
import {
  getVenuesForMode,
  getIntegratedVenuesForMode,
  getArbitrageStrategiesForMode,
  canUsePerpetuals,
  canUseMargin,
  getDefaultVenue,
  VENUES,
  ARBITRAGE_STRATEGIES,
  TRADING_MODES,
} from './tradingModes';

describe('Trading Modes', () => {
  describe('getVenuesForMode', () => {
    it('should return US-compliant venues for US mode', () => {
      const venues = getVenuesForMode('us');
      expect(venues.length).toBeGreaterThan(0);
      // All returned venues should include 'us' in their modes
      for (const venue of venues) {
        expect(venue.modes).toContain('us');
      }
    });

    it('should return more venues for international mode', () => {
      const usVenues = getVenuesForMode('us');
      const intlVenues = getVenuesForMode('international');
      expect(intlVenues.length).toBeGreaterThan(usVenues.length);
    });

    it('should not include Binance global in US mode', () => {
      const venues = getVenuesForMode('us');
      const venueIds = venues.map(v => v.id);
      expect(venueIds).not.toContain('binance');
    });
  });

  describe('getIntegratedVenuesForMode', () => {
    it('should only return API-integrated venues', () => {
      const venues = getIntegratedVenuesForMode('us');
      for (const venue of venues) {
        expect(venue.apiIntegrated).toBe(true);
      }
    });

    it('should return fewer venues than total mode venues', () => {
      const allVenues = getVenuesForMode('international');
      const integrated = getIntegratedVenuesForMode('international');
      expect(integrated.length).toBeLessThanOrEqual(allVenues.length);
    });
  });

  describe('getArbitrageStrategiesForMode', () => {
    it('should return strategies for US mode', () => {
      const strategies = getArbitrageStrategiesForMode('us');
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should return more strategies for international', () => {
      const usStrategies = getArbitrageStrategiesForMode('us');
      const intlStrategies = getArbitrageStrategiesForMode('international');
      expect(intlStrategies.length).toBeGreaterThanOrEqual(usStrategies.length);
    });

    it('should include funding rate arb only in international', () => {
      const usStrategies = getArbitrageStrategiesForMode('us');
      const intlStrategies = getArbitrageStrategiesForMode('international');
      expect(usStrategies.find(s => s.id === 'funding_rate')).toBeUndefined();
      expect(intlStrategies.find(s => s.id === 'funding_rate')).toBeDefined();
    });
  });

  describe('canUsePerpetuals', () => {
    it('should return false for US mode', () => {
      expect(canUsePerpetuals('us')).toBe(false);
    });

    it('should return true for international mode', () => {
      expect(canUsePerpetuals('international')).toBe(true);
    });
  });

  describe('canUseMargin', () => {
    it('should return true for both modes', () => {
      expect(canUseMargin('us')).toBe(true);
      expect(canUseMargin('international')).toBe(true);
    });
  });

  describe('getDefaultVenue', () => {
    it('should return coinbase for US mode', () => {
      expect(getDefaultVenue('us')).toBe('coinbase');
    });

    it('should return binance for international mode', () => {
      expect(getDefaultVenue('international')).toBe('binance');
    });
  });

  describe('VENUES config', () => {
    it('should have Coinbase as US-compliant', () => {
      expect(VENUES.coinbase.usCompliant).toBe(true);
    });

    it('should have Binance as non-US-compliant', () => {
      expect(VENUES.binance.usCompliant).toBe(false);
    });

    it('should have perpetuals only on international venues', () => {
      expect(VENUES.coinbase.capabilities.perpetuals).toBe(false);
      expect(VENUES.binance.capabilities.perpetuals).toBe(true);
    });
  });

  describe('TRADING_MODES config', () => {
    it('should disable perpetuals in US mode', () => {
      expect(TRADING_MODES.us.features.perpetuals).toBe(false);
    });

    it('should enable perpetuals in international mode', () => {
      expect(TRADING_MODES.international.features.perpetuals).toBe(true);
    });
  });
});
