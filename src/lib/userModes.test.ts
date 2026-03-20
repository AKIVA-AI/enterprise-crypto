import { describe, it, expect } from 'vitest';
import {
  getModeConfig,
  canTrade,
  canPaperTrade,
  getRiskLimits,
  getSafetyRails,
  getEducationalSettings,
  validateTradeAgainstMode,
  getRecommendedMode,
  USER_MODES,
} from './userModes';

describe('User Modes', () => {
  describe('getModeConfig', () => {
    it('should return config for all modes', () => {
      const modes = ['observer', 'paper', 'guarded', 'advanced'] as const;
      for (const mode of modes) {
        const config = getModeConfig(mode);
        expect(config.id).toBe(mode);
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
      }
    });
  });

  describe('canTrade', () => {
    it('should return false for observer', () => {
      expect(canTrade('observer')).toBe(false);
    });

    it('should return false for paper', () => {
      expect(canTrade('paper')).toBe(false);
    });

    it('should return true for guarded', () => {
      expect(canTrade('guarded')).toBe(true);
    });

    it('should return true for advanced', () => {
      expect(canTrade('advanced')).toBe(true);
    });
  });

  describe('canPaperTrade', () => {
    it('should return false for observer', () => {
      expect(canPaperTrade('observer')).toBe(false);
    });

    it('should return true for paper mode', () => {
      expect(canPaperTrade('paper')).toBe(true);
    });

    it('should return true for guarded', () => {
      expect(canPaperTrade('guarded')).toBe(true);
    });
  });

  describe('getRiskLimits', () => {
    it('should return zero limits for observer', () => {
      const limits = getRiskLimits('observer');
      expect(limits.maxPositionSizePercent).toBe(0);
      expect(limits.forceReduceOnly).toBe(true);
    });

    it('should return conservative limits for guarded', () => {
      const limits = getRiskLimits('guarded');
      expect(limits.maxPositionSizePercent).toBe(2);
      expect(limits.maxDailyLossPercent).toBe(2);
      expect(limits.requireConfirmation).toBe(true);
    });

    it('should return higher limits for advanced', () => {
      const limits = getRiskLimits('advanced');
      expect(limits.maxPositionSizePercent).toBe(10);
      expect(limits.requireConfirmation).toBe(false);
    });
  });

  describe('getSafetyRails', () => {
    it('should always have kill switch enabled', () => {
      const modes = ['observer', 'paper', 'guarded', 'advanced'] as const;
      for (const mode of modes) {
        const rails = getSafetyRails(mode);
        expect(rails.killSwitchEnabled).toBe(true);
      }
    });

    it('should always have auto stop loss', () => {
      const modes = ['observer', 'paper', 'guarded', 'advanced'] as const;
      for (const mode of modes) {
        const rails = getSafetyRails(mode);
        expect(rails.autoStopLoss).toBe(true);
      }
    });
  });

  describe('getEducationalSettings', () => {
    it('should show all education for observer', () => {
      const settings = getEducationalSettings('observer');
      expect(settings.showExplanations).toBe(true);
      expect(settings.showRiskEducation).toBe(true);
    });

    it('should allow hiding explanations for advanced', () => {
      const settings = getEducationalSettings('advanced');
      expect(settings.showExplanations).toBe(false);
    });
  });

  describe('validateTradeAgainstMode', () => {
    it('should block trades in observer mode', () => {
      const result = validateTradeAgainstMode('observer', {
        positionSizePercent: 1,
        currentExposurePercent: 0,
        dailyLossPercent: 0,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Observer');
    });

    it('should block oversized trades in guarded mode', () => {
      const result = validateTradeAgainstMode('guarded', {
        positionSizePercent: 5, // Exceeds 2% limit
        currentExposurePercent: 0,
        dailyLossPercent: 0,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds');
    });

    it('should allow valid trades in guarded mode', () => {
      const result = validateTradeAgainstMode('guarded', {
        positionSizePercent: 1,
        currentExposurePercent: 3,
        dailyLossPercent: 0.5,
      });
      expect(result.allowed).toBe(true);
    });

    it('should block when daily loss limit reached', () => {
      const result = validateTradeAgainstMode('guarded', {
        positionSizePercent: 1,
        currentExposurePercent: 0,
        dailyLossPercent: 2, // At the 2% limit
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily loss');
    });

    it('should block when total exposure would be exceeded', () => {
      const result = validateTradeAgainstMode('guarded', {
        positionSizePercent: 2,
        currentExposurePercent: 9, // 9 + 2 > 10% limit
        dailyLossPercent: 0,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exposure');
    });
  });

  describe('getRecommendedMode', () => {
    it('should recommend observer for new users', () => {
      expect(getRecommendedMode({
        hasCompletedTutorial: false,
        paperTradingDays: 0,
        totalTrades: 0,
        winRate: 0,
      })).toBe('observer');
    });

    it('should recommend paper after tutorial', () => {
      expect(getRecommendedMode({
        hasCompletedTutorial: true,
        paperTradingDays: 3,
        totalTrades: 5,
        winRate: 0.5,
      })).toBe('paper');
    });

    it('should recommend guarded after some experience', () => {
      expect(getRecommendedMode({
        hasCompletedTutorial: true,
        paperTradingDays: 14,
        totalTrades: 50,
        winRate: 0.5,
      })).toBe('guarded');
    });

    it('should recommend advanced for experienced traders', () => {
      expect(getRecommendedMode({
        hasCompletedTutorial: true,
        paperTradingDays: 60,
        totalTrades: 200,
        winRate: 0.55,
      })).toBe('advanced');
    });

    it('should keep guarded with low win rate', () => {
      expect(getRecommendedMode({
        hasCompletedTutorial: true,
        paperTradingDays: 60,
        totalTrades: 200,
        winRate: 0.3, // Below 0.4 threshold
      })).toBe('guarded');
    });
  });

  describe('USER_MODES invariants', () => {
    it('should never allow disabling core safety rails', () => {
      const modes = ['observer', 'paper', 'guarded', 'advanced'] as const;
      for (const mode of modes) {
        expect(USER_MODES[mode].features.canDisableSafetyRails).toBe(false);
      }
    });
  });
});
