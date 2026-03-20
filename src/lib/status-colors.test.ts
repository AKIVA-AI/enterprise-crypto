import { describe, it, expect } from 'vitest';
import {
  sentiment,
  sentimentByValue,
  riskLevel,
  riskFromScore,
  statusColor,
  tradingMode,
  directionColor,
  categoryBadge,
  difficultyBadge,
  exchangeBadge,
  channelBadge,
} from './status-colors';

describe('Status Colors', () => {
  describe('sentiment', () => {
    it('should return success class for positive', () => {
      expect(sentiment('positive')).toContain('success');
    });

    it('should return destructive class for negative', () => {
      expect(sentiment('negative')).toContain('destructive');
    });

    it('should return muted class for neutral', () => {
      expect(sentiment('neutral')).toContain('muted');
    });
  });

  describe('sentimentByValue', () => {
    it('should return positive for values > 0', () => {
      expect(sentimentByValue(100)).toContain('success');
    });

    it('should return negative for values < 0', () => {
      expect(sentimentByValue(-50)).toContain('destructive');
    });

    it('should return neutral for zero', () => {
      expect(sentimentByValue(0)).toContain('muted');
    });
  });

  describe('riskLevel', () => {
    it('should return style object for low risk', () => {
      const style = riskLevel('low');
      expect(style.text).toContain('success');
      expect(style.badge).toBeDefined();
    });

    it('should return style object for high risk', () => {
      const style = riskLevel('high');
      expect(style.text).toContain('destructive');
    });

    it('should return animate-pulse for critical', () => {
      const style = riskLevel('critical');
      expect(style.icon).toContain('animate-pulse');
    });
  });

  describe('riskFromScore', () => {
    it('should return low for score < 40', () => {
      expect(riskFromScore(20)).toBe('low');
    });

    it('should return medium for score 40-59', () => {
      expect(riskFromScore(50)).toBe('medium');
    });

    it('should return high for score 60-79', () => {
      expect(riskFromScore(70)).toBe('high');
    });

    it('should return critical for score >= 80', () => {
      expect(riskFromScore(90)).toBe('critical');
    });

    it('should return low for zero', () => {
      expect(riskFromScore(0)).toBe('low');
    });
  });

  describe('statusColor', () => {
    it('should return styles for all status types', () => {
      const statuses = ['success', 'warning', 'error', 'info', 'neutral'] as const;
      for (const s of statuses) {
        const style = statusColor(s);
        expect(style.text).toBeDefined();
        expect(style.badge).toBeDefined();
        expect(style.container).toBeDefined();
      }
    });
  });

  describe('tradingMode', () => {
    it('should return primary colors for US mode', () => {
      const style = tradingMode('us');
      expect(style.text).toContain('primary');
    });

    it('should return warning colors for international mode', () => {
      const style = tradingMode('international');
      expect(style.text).toContain('warning');
    });
  });

  describe('directionColor', () => {
    it('should return success for bullish', () => {
      expect(directionColor('bullish')).toContain('success');
    });

    it('should return destructive for bearish', () => {
      expect(directionColor('bearish')).toContain('destructive');
    });
  });

  describe('categoryBadge', () => {
    it('should return a string for all categories', () => {
      const categories = ['trend', 'mean-reversion', 'arbitrage', 'momentum', 'volatility', 'statistical', 'market-making', 'factor'] as const;
      for (const cat of categories) {
        expect(categoryBadge(cat)).toBeTruthy();
      }
    });
  });

  describe('difficultyBadge', () => {
    it('should return success for beginner', () => {
      expect(difficultyBadge('beginner')).toContain('success');
    });

    it('should return warning for intermediate', () => {
      expect(difficultyBadge('intermediate')).toContain('warning');
    });

    it('should return destructive for advanced', () => {
      expect(difficultyBadge('advanced')).toContain('destructive');
    });
  });

  describe('exchangeBadge', () => {
    it('should return styles for known exchanges', () => {
      expect(exchangeBadge('coinbase')).toBeTruthy();
      expect(exchangeBadge('binance')).toBeTruthy();
    });

    it('should return default for unknown exchange', () => {
      expect(exchangeBadge('default')).toBeTruthy();
    });
  });

  describe('channelBadge', () => {
    it('should return styles for all channels', () => {
      const channels = ['telegram', 'discord', 'slack', 'webhook'] as const;
      for (const ch of channels) {
        expect(channelBadge(ch)).toBeTruthy();
      }
    });
  });
});
