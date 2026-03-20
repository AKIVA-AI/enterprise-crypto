import { describe, it, expect } from 'vitest';
import {
  parseInstrument,
  toBinanceSymbol,
  toCoinbaseSymbol,
  toStandardSymbol,
  isPerpetual,
  isDerivative,
  normalizeInstrument,
  getInstrumentDisplayName,
} from './instrumentParser';

describe('Instrument Parser', () => {
  describe('parseInstrument', () => {
    it('should parse spot BTC/USDT', () => {
      const result = parseInstrument('BTC/USDT');
      expect(result.baseAsset).toBe('BTC');
      expect(result.quoteAsset).toBe('USDT');
      expect(result.productType).toBe('spot');
      expect(result.isInverse).toBe(false);
    });

    it('should parse dash-delimited symbol', () => {
      const result = parseInstrument('ETH-USDC');
      expect(result.baseAsset).toBe('ETH');
      expect(result.quoteAsset).toBe('USDC');
      expect(result.productType).toBe('spot');
    });

    it('should parse concatenated Binance symbol', () => {
      const result = parseInstrument('BTCUSDT');
      expect(result.baseAsset).toBe('BTC');
      expect(result.quoteAsset).toBe('USDT');
    });

    it('should parse perpetual symbol', () => {
      const result = parseInstrument('BTC-USDT-PERP');
      expect(result.baseAsset).toBe('BTC');
      expect(result.quoteAsset).toBe('USDT');
      expect(result.productType).toBe('perpetual');
      expect(result.expiry).toBe('PERP');
    });

    it('should parse perpetual suffix PERP', () => {
      const result = parseInstrument('ETHUSDT_PERP');
      expect(result.productType).toBe('perpetual');
    });

    it('should parse futures with expiry date', () => {
      const result = parseInstrument('BTCUSDT240329');
      expect(result.productType).toBe('futures');
      expect(result.expiry).toBeDefined();
    });

    it('should detect inverse contracts (USD quote on non-spot)', () => {
      const result = parseInstrument('BTCUSDPERP');
      expect(result.isInverse).toBe(true);
      expect(result.productType).toBe('perpetual');
    });

    it('should handle empty string gracefully', () => {
      const result = parseInstrument('');
      expect(result.baseAsset).toBe('UNKNOWN');
      expect(result.productType).toBe('unknown');
    });

    it('should handle null-like input gracefully', () => {
      const result = parseInstrument(null as any);
      expect(result.baseAsset).toBe('UNKNOWN');
      expect(result.productType).toBe('unknown');
    });
  });

  describe('toBinanceSymbol', () => {
    it('should format as concatenated uppercase', () => {
      const parsed = parseInstrument('BTC/USDT');
      expect(toBinanceSymbol(parsed)).toBe('BTCUSDT');
    });
  });

  describe('toCoinbaseSymbol', () => {
    it('should format with dash', () => {
      const parsed = parseInstrument('BTC/USDT');
      expect(toCoinbaseSymbol(parsed)).toBe('BTC-USDT');
    });
  });

  describe('toStandardSymbol', () => {
    it('should format as BASE-QUOTE', () => {
      const parsed = parseInstrument('ETHUSDT');
      expect(toStandardSymbol(parsed)).toBe('ETH-USDT');
    });
  });

  describe('isPerpetual', () => {
    it('should return true for perpetual', () => {
      const parsed = parseInstrument('BTCUSDTPERP');
      expect(isPerpetual(parsed)).toBe(true);
    });

    it('should return false for spot', () => {
      const parsed = parseInstrument('BTCUSDT');
      expect(isPerpetual(parsed)).toBe(false);
    });

    it('should return true for swap', () => {
      const parsed = parseInstrument('BTC-USD-SWAP');
      expect(isPerpetual(parsed)).toBe(true);
    });
  });

  describe('isDerivative', () => {
    it('should return false for spot', () => {
      const parsed = parseInstrument('BTC/USDT');
      expect(isDerivative(parsed)).toBe(false);
    });

    it('should return true for perpetual', () => {
      const parsed = parseInstrument('BTCUSDTPERP');
      expect(isDerivative(parsed)).toBe(true);
    });

    it('should return true for futures', () => {
      const parsed = parseInstrument('BTCUSDT240329');
      expect(isDerivative(parsed)).toBe(true);
    });
  });

  describe('normalizeInstrument', () => {
    it('should normalize various formats to BASE-QUOTE', () => {
      expect(normalizeInstrument('BTCUSDT')).toBe('BTC-USDT');
      expect(normalizeInstrument('BTC/USDT')).toBe('BTC-USDT');
      expect(normalizeInstrument('BTC-USDT')).toBe('BTC-USDT');
    });
  });

  describe('getInstrumentDisplayName', () => {
    it('should display spot as BASE/QUOTE', () => {
      expect(getInstrumentDisplayName('BTCUSDT')).toBe('BTC/USDT');
    });

    it('should append PERP for perpetuals', () => {
      expect(getInstrumentDisplayName('BTCUSDTPERP')).toBe('BTC/USDT PERP');
    });

    it('should append SWAP for swap', () => {
      expect(getInstrumentDisplayName('BTC-USDT-SWAP')).toBe('BTC/USDT SWAP');
    });
  });
});
