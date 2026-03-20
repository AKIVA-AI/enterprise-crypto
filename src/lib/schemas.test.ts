import { describe, it, expect } from 'vitest';
import {
  DirectionSchema,
  LifecycleStateSchema,
  HealthStatusSchema,
  TradeOrderSchema,
  parseDecisionTrace,
  parseLifecycleTransition,
  parseSystemHealthRecord,
  validateTradeOrder,
  assertLifecycleState,
} from './schemas';

describe('Zod Schemas', () => {
  describe('DirectionSchema', () => {
    it('should accept buy', () => {
      expect(DirectionSchema.parse('buy')).toBe('buy');
    });

    it('should accept sell', () => {
      expect(DirectionSchema.parse('sell')).toBe('sell');
    });

    it('should normalize LONG to buy', () => {
      expect(DirectionSchema.parse('LONG')).toBe('buy');
    });

    it('should normalize SHORT to sell', () => {
      expect(DirectionSchema.parse('SHORT')).toBe('sell');
    });

    it('should reject invalid direction', () => {
      expect(() => DirectionSchema.parse('invalid')).toThrow();
    });
  });

  describe('LifecycleStateSchema', () => {
    it('should accept all valid states', () => {
      const states = ['active', 'quarantined', 'disabled', 'paper_only', 'cooldown'];
      for (const state of states) {
        expect(LifecycleStateSchema.parse(state)).toBe(state);
      }
    });

    it('should reject invalid state', () => {
      expect(() => LifecycleStateSchema.parse('running')).toThrow();
    });
  });

  describe('HealthStatusSchema', () => {
    it('should accept healthy', () => {
      expect(HealthStatusSchema.parse('healthy')).toBe('healthy');
    });

    it('should accept degraded', () => {
      expect(HealthStatusSchema.parse('degraded')).toBe('degraded');
    });

    it('should accept unhealthy', () => {
      expect(HealthStatusSchema.parse('unhealthy')).toBe('unhealthy');
    });
  });

  describe('validateTradeOrder', () => {
    const validOrder = {
      bookId: '550e8400-e29b-41d4-a716-446655440000',
      instrument: 'BTC-USDT',
      side: 'buy',
      size: 0.5,
      orderType: 'market',
      venue: 'coinbase',
    };

    it('should validate a valid market order', () => {
      const result = validateTradeOrder(validOrder);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.order.instrument).toBe('BTC-USDT');
      }
    });

    it('should validate a limit order with price', () => {
      const result = validateTradeOrder({
        ...validOrder,
        orderType: 'limit',
        price: 50000,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject negative size', () => {
      const result = validateTradeOrder({
        ...validOrder,
        size: -1,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should reject zero size', () => {
      const result = validateTradeOrder({
        ...validOrder,
        size: 0,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject empty instrument', () => {
      const result = validateTradeOrder({
        ...validOrder,
        instrument: '',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid side', () => {
      const result = validateTradeOrder({
        ...validOrder,
        side: 'hold',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid order type', () => {
      const result = validateTradeOrder({
        ...validOrder,
        orderType: 'stop',
      });
      expect(result.valid).toBe(false);
    });

    it('should accept optional stopLoss and takeProfit', () => {
      const result = validateTradeOrder({
        ...validOrder,
        stopLoss: 45000,
        takeProfit: 55000,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('parseDecisionTrace', () => {
    it('should return null for invalid data', () => {
      expect(parseDecisionTrace({})).toBeNull();
    });

    it('should return null for null', () => {
      expect(parseDecisionTrace(null)).toBeNull();
    });

    it('should parse valid decision trace', () => {
      const validTrace = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        trace_id: 'trace-123',
        timestamp: '2024-01-01T00:00:00Z',
        instrument: 'BTC-USDT',
        direction: 'buy',
        strategy_name: 'trend_following',
        strategy_id: '550e8400-e29b-41d4-a716-446655440001',
        signal_strength: 0.8,
        confidence: 0.75,
        target_exposure_usd: 5000,
        decision: 'EXECUTED',
        gates_checked: [
          { gate: 'KILL_SWITCH', passed: true },
        ],
        costs: { spread: 0.01 },
        regime: { current: 'bullish' },
        block_reasons: null,
        reason_codes: null,
        explanation: 'Trade executed successfully',
      };
      const result = parseDecisionTrace(validTrace);
      expect(result).not.toBeNull();
      expect(result?.instrument).toBe('BTC-USDT');
    });
  });

  describe('parseLifecycleTransition', () => {
    it('should return null for invalid data', () => {
      expect(parseLifecycleTransition({})).toBeNull();
    });

    it('should parse valid transition', () => {
      const result = parseLifecycleTransition({
        strategy_id: '550e8400-e29b-41d4-a716-446655440000',
        from_state: 'active',
        to_state: 'quarantined',
        reason: 'Performance below threshold',
        triggered_by: 'risk_engine',
      });
      expect(result).not.toBeNull();
      expect(result?.to_state).toBe('quarantined');
    });
  });

  describe('parseSystemHealthRecord', () => {
    it('should return null for invalid data', () => {
      expect(parseSystemHealthRecord({})).toBeNull();
    });

    it('should parse valid health record', () => {
      const result = parseSystemHealthRecord({
        id: '550e8400-e29b-41d4-a716-446655440000',
        component: 'oms',
        status: 'healthy',
        last_check_at: '2024-01-01T00:00:00Z',
        error_message: null,
        details: null,
      });
      expect(result).not.toBeNull();
      expect(result?.status).toBe('healthy');
    });
  });

  describe('assertLifecycleState', () => {
    it('should not throw for valid state', () => {
      expect(() => assertLifecycleState('active')).not.toThrow();
    });

    it('should throw for invalid state', () => {
      expect(() => assertLifecycleState('invalid')).toThrow('Invalid lifecycle state');
    });
  });
});
