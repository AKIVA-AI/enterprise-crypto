/**
 * Server-Side Compliance Enforcement
 * 
 * This module provides compliance policy enforcement that should be validated
 * server-side (Edge Functions / Backend) before any trading action.
 * 
 * CRITICAL: Frontend restrictions are for UX only - all enforcement MUST happen server-side
 */

import { TradingMode, VENUES, TRADING_MODES } from './tradingModes';

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  auditEvent?: ComplianceAuditEvent;
}

export interface ComplianceAuditEvent {
  type: 'compliance_block';
  action: string;
  mode: TradingMode;
  venue?: string;
  instrument?: string;
  feature?: string;
  reason: string;
  timestamp: string;
}

export interface CompliancePolicy {
  mode: TradingMode;
  blockedVenues: string[];
  blockedFeatures: string[];
  blockedInstrumentTypes: string[];
  maxLeverage: number;
}

// Compliance policies - these define what is NOT allowed
export const COMPLIANCE_POLICIES: Record<TradingMode, CompliancePolicy> = {
  us: {
    mode: 'us',
    blockedVenues: ['binance', 'bybit', 'okx', 'hyperliquid', 'deribit'],
    blockedFeatures: ['perpetuals', 'options', 'high_leverage'],
    blockedInstrumentTypes: ['PERP', 'PERPETUAL', 'SWAP', 'OPTION'],
    maxLeverage: 5, // Max 5x for US
  },
  international: {
    mode: 'international',
    blockedVenues: [], // All venues allowed
    blockedFeatures: [], // All features allowed
    blockedInstrumentTypes: [],
    maxLeverage: 125, // Full leverage allowed
  },
};

/**
 * Check if a venue is allowed for the given mode
 */
export function checkVenueCompliance(mode: TradingMode, venueId: string): ComplianceCheckResult {
  const policy = COMPLIANCE_POLICIES[mode];
  
  if (policy.blockedVenues.includes(venueId)) {
    return {
      allowed: false,
      reason: `Venue "${venueId}" is not available in ${mode.toUpperCase()} mode due to regulatory restrictions`,
      auditEvent: {
        type: 'compliance_block',
        action: 'venue_access',
        mode,
        venue: venueId,
        reason: `Blocked venue: ${venueId}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  return { allowed: true };
}

/**
 * Check if a feature (perpetuals, margin, etc.) is allowed for the given mode
 */
export function checkFeatureCompliance(
  mode: TradingMode, 
  feature: 'spot' | 'futures' | 'perpetuals' | 'margin' | 'staking' | 'options'
): ComplianceCheckResult {
  const modeConfig = TRADING_MODES[mode];
  
  if (!modeConfig.features[feature]) {
    return {
      allowed: false,
      reason: `${feature.charAt(0).toUpperCase() + feature.slice(1)} trading is not available in ${mode.toUpperCase()} mode`,
      auditEvent: {
        type: 'compliance_block',
        action: 'feature_access',
        mode,
        feature,
        reason: `Blocked feature: ${feature}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  return { allowed: true };
}

/**
 * Check if an instrument type is allowed for the given mode
 */
export function checkInstrumentCompliance(mode: TradingMode, instrument: string): ComplianceCheckResult {
  const policy = COMPLIANCE_POLICIES[mode];
  const upperInstrument = instrument.toUpperCase();
  
  // Check for blocked instrument types
  for (const blockedType of policy.blockedInstrumentTypes) {
    if (upperInstrument.includes(blockedType)) {
      return {
        allowed: false,
        reason: `Instrument type "${blockedType}" is not available in ${mode.toUpperCase()} mode`,
        auditEvent: {
          type: 'compliance_block',
          action: 'instrument_access',
          mode,
          instrument,
          reason: `Blocked instrument type: ${blockedType}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Check if leverage is within allowed limits for the mode
 */
export function checkLeverageCompliance(mode: TradingMode, leverage: number): ComplianceCheckResult {
  const policy = COMPLIANCE_POLICIES[mode];
  
  if (leverage > policy.maxLeverage) {
    return {
      allowed: false,
      reason: `Leverage ${leverage}x exceeds maximum allowed (${policy.maxLeverage}x) for ${mode.toUpperCase()} mode`,
      auditEvent: {
        type: 'compliance_block',
        action: 'leverage_check',
        mode,
        reason: `Leverage ${leverage}x exceeds max ${policy.maxLeverage}x`,
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  return { allowed: true };
}

/**
 * Comprehensive compliance check for a trade request
 */
export function validateTradeCompliance(params: {
  mode: TradingMode;
  venue: string;
  instrument: string;
  leverage?: number;
  isPerp?: boolean;
  isMargin?: boolean;
}): ComplianceCheckResult {
  const { mode, venue, instrument, leverage = 1, isPerp = false, isMargin = false } = params;
  
  // Check venue
  const venueCheck = checkVenueCompliance(mode, venue);
  if (!venueCheck.allowed) return venueCheck;
  
  // Check instrument
  const instrumentCheck = checkInstrumentCompliance(mode, instrument);
  if (!instrumentCheck.allowed) return instrumentCheck;
  
  // Check perpetual feature if applicable
  if (isPerp) {
    const perpCheck = checkFeatureCompliance(mode, 'perpetuals');
    if (!perpCheck.allowed) return perpCheck;
  }
  
  // Check margin feature if applicable
  if (isMargin && leverage > 1) {
    const marginCheck = checkFeatureCompliance(mode, 'margin');
    if (!marginCheck.allowed) return marginCheck;
  }
  
  // Check leverage limits
  const leverageCheck = checkLeverageCompliance(mode, leverage);
  if (!leverageCheck.allowed) return leverageCheck;
  
  return { allowed: true };
}

/**
 * IMPORTANT: This is used for display purposes only.
 * Actual enforcement happens server-side.
 * 
 * Returns disclaimer text for strategies and returns
 */
export const RISK_DISCLAIMERS = {
  performanceClaim: 'Past performance and backtested results do not guarantee future returns. All trading involves risk of loss.',
  
  strategyReturn: 'Historical returns shown are based on backtested data and may not reflect actual trading results. Trading cryptocurrencies involves substantial risk.',
  
  leverageWarning: 'Leveraged trading significantly increases risk. You could lose more than your initial investment.',
  
  notFinancialAdvice: 'This is not financial advice. Consult a licensed financial advisor before making investment decisions.',
  
  regulatoryNotice: 'Cryptocurrency trading may not be available in all jurisdictions. Users are responsible for compliance with local laws.',
  
  fullDisclaimer: `RISK DISCLOSURE: Trading cryptocurrencies and derivatives involves substantial risk of loss and is not suitable for all investors. 
Past performance, whether actual or indicated by historical tests, is not indicative of future results. 
All performance figures are hypothetical and based on backtested data. 
Actual trading results may vary significantly from backtested results due to slippage, execution delays, market conditions, and other factors.
Leverage amplifies both gains and losses. You could lose more than your initial investment.
This platform is for informational purposes only and does not constitute financial, investment, trading, or other advice.
Before trading, consider your financial situation, investment objectives, and risk tolerance.`,
};

/**
 * Format expected return with disclaimer
 */
export function formatReturnWithDisclaimer(expectedReturn: string): {
  display: string;
  disclaimer: string;
} {
  return {
    display: `${expectedReturn}*`,
    disclaimer: RISK_DISCLAIMERS.strategyReturn,
  };
}

/**
 * Check if user acknowledged risk disclosure
 * This should be stored server-side per user
 */
export interface RiskAcknowledgment {
  userId: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  version: string;
}

export const CURRENT_DISCLOSURE_VERSION = '2024-01-15-v1';
