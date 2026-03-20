import { describe, it, expect } from 'vitest';
import {
  extractBaseAsset,
  toCanonicalSymbol,
  toBinanceSymbol,
  toApiSymbol,
  fromApiSymbol,
  isSymbolSupported,
  getCoinGeckoId,
  formatSymbolDisplay,
  symbolsEqual,
} from './symbolUtils';

describe('Symbol Utilities', () => {
  describe('extractBaseAsset', () => {
    it('should extract from dash-delimited format', () => {
      expect(extractBaseAsset('BTC-USDT')).toBe('BTC');
    });

    it('should extract from slash-delimited format', () => {
      expect(extractBaseAsset('ETH/USD')).toBe('ETH');
    });

    it('should extract from concatenated format', () => {
      expect(extractBaseAsset('BTCUSDT')).toBe('BTC');
    });

    it('should extract from underscore-delimited format', () => {
      expect(extractBaseAsset('SOL_USDC')).toBe('SOL');
    });

    it('should handle lowercase input', () => {
      expect(extractBaseAsset('btc-usdt')).toBe('BTC');
    });

    it('should handle whitespace', () => {
      expect(extractBaseAsset(' BTC-USDT ')).toBe('BTC');
    });

    it('should return full symbol when no quote asset match', () => {
      expect(extractBaseAsset('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('toCanonicalSymbol', () => {
    it('should pass through dash format', () => {
      expect(toCanonicalSymbol('BTC-USDT')).toBe('BTC-USDT');
    });

    it('should convert slash to dash', () => {
      expect(toCanonicalSymbol('BTC/USDT')).toBe('BTC-USDT');
    });

    it('should convert concatenated to dash', () => {
      expect(toCanonicalSymbol('ETHUSDT')).toBe('ETH-USDT');
    });

    it('should default to USDT quote when no match', () => {
      expect(toCanonicalSymbol('XRP')).toBe('XRP-USDT');
    });

    it('should handle USDC quote', () => {
      expect(toCanonicalSymbol('BTCUSDC')).toBe('BTC-USDC');
    });

    it('should handle BTC as quote asset', () => {
      expect(toCanonicalSymbol('ETHBTC')).toBe('ETH-BTC');
    });
  });

  describe('toBinanceSymbol', () => {
    it('should remove dash from canonical format', () => {
      expect(toBinanceSymbol('BTC-USDT')).toBe('BTCUSDT');
    });

    it('should handle slash format', () => {
      expect(toBinanceSymbol('ETH/USDT')).toBe('ETHUSDT');
    });
  });

  describe('toApiSymbol / fromApiSymbol', () => {
    it('toApiSymbol should return Binance format', () => {
      expect(toApiSymbol('BTC-USDT')).toBe('BTCUSDT');
    });

    it('fromApiSymbol should return canonical format', () => {
      expect(fromApiSymbol('BTCUSDT')).toBe('BTC-USDT');
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for BTC', () => {
      expect(isSymbolSupported('BTC-USDT')).toBe(true);
    });

    it('should return true for ETH', () => {
      expect(isSymbolSupported('ETHUSDT')).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(isSymbolSupported('FAKECOIN-USDT')).toBe(false);
    });
  });

  describe('getCoinGeckoId', () => {
    it('should return bitcoin for BTC', () => {
      expect(getCoinGeckoId('BTC-USDT')).toBe('bitcoin');
    });

    it('should return ethereum for ETH', () => {
      expect(getCoinGeckoId('ETH/USD')).toBe('ethereum');
    });

    it('should return null for unsupported', () => {
      expect(getCoinGeckoId('NOSUCH')).toBeNull();
    });
  });

  describe('formatSymbolDisplay', () => {
    it('should format with slash separator', () => {
      expect(formatSymbolDisplay('BTC-USDT')).toBe('BTC/USDT');
    });

    it('should format concatenated to slash', () => {
      expect(formatSymbolDisplay('ETHUSDT')).toBe('ETH/USDT');
    });
  });

  describe('symbolsEqual', () => {
    it('should match same symbol in different formats', () => {
      expect(symbolsEqual('BTC-USDT', 'BTC/USDT')).toBe(true);
    });

    it('should match canonical with concatenated', () => {
      expect(symbolsEqual('BTCUSDT', 'BTC-USDT')).toBe(true);
    });

    it('should not match different symbols', () => {
      expect(symbolsEqual('BTC-USDT', 'ETH-USDT')).toBe(false);
    });
  });
});
