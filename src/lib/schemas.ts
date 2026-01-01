/**
 * Zod schemas for type-safe validation
 * 
 * These schemas provide runtime validation for safety-critical operations.
 * Use these instead of unsafe `as unknown as` casts where possible.
 */

import { z } from 'zod';

// ====================
// Decision Trace Schema
// ====================

export const DecisionTraceSchema = z.object({
  id: z.string().uuid(),
  trace_id: z.string(),
  timestamp: z.string().datetime(),
  instrument: z.string().min(1),
  direction: z.enum(['buy', 'sell']),
  strategy_name: z.string(),
  strategy_id: z.string().uuid().nullable(),
  signal_strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  target_exposure_usd: z.number().min(0),
  decision: z.enum(['EXECUTED', 'BLOCKED', 'MODIFIED', 'PENDING']),
  gates_checked: z.array(z.object({
    gate: z.string(),
    passed: z.boolean(),
    reason: z.string().optional(),
    checkedAt: z.string().datetime(),
  })),
  costs: z.object({
    spread: z.number().optional(),
    slippage: z.number().optional(),
    fees: z.number().optional(),
    total: z.number().optional(),
  }).optional(),
  regime: z.object({
    current: z.string().optional(),
    volatility: z.string().optional(),
    trend: z.string().optional(),
  }).optional(),
  block_reasons: z.array(z.string()).nullable(),
  reason_codes: z.array(z.string()).nullable(),
  explanation: z.string(),
});

export type DecisionTrace = z.infer<typeof DecisionTraceSchema>;

// ====================
// Strategy Lifecycle Schema
// ====================

export const LifecycleStateSchema = z.enum([
  'active',
  'quarantined',
  'disabled',
  'paper_only',
  'cooldown',
]);

export type LifecycleState = z.infer<typeof LifecycleStateSchema>;

export const LifecycleTransitionSchema = z.object({
  strategy_id: z.string().uuid(),
  from_state: LifecycleStateSchema,
  to_state: LifecycleStateSchema,
  reason: z.string().min(1),
  triggered_by: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type LifecycleTransition = z.infer<typeof LifecycleTransitionSchema>;

export const LifecycleEventSchema = z.object({
  id: z.string().uuid(),
  strategy_id: z.string().uuid(),
  from_state: z.string(),
  to_state: z.string(),
  reason: z.string(),
  triggered_by: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
});

export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;

// ====================
// System Health Schema
// ====================

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const SystemHealthRecordSchema = z.object({
  id: z.string().uuid(),
  component: z.string(),
  status: HealthStatusSchema,
  last_check_at: z.string().datetime(),
  error_message: z.string().nullable(),
  details: z.record(z.unknown()).nullable(),
});

export type SystemHealthRecord = z.infer<typeof SystemHealthRecordSchema>;

// ====================
// Trading Gate Schema
// ====================

export const TradingStateSchema = z.enum(['halted', 'reduce_only', 'normal']);
export type TradingState = z.infer<typeof TradingStateSchema>;

export const BookStatusSchema = z.enum(['active', 'frozen', 'halted', 'reduce_only']);
export type BookStatus = z.infer<typeof BookStatusSchema>;

export const OrderSideSchema = z.enum(['buy', 'sell']);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const TradeOrderSchema = z.object({
  bookId: z.string().uuid(),
  instrument: z.string().min(1),
  side: OrderSideSchema,
  size: z.number().positive(),
  price: z.number().positive().optional(),
  orderType: z.enum(['market', 'limit']),
  venue: z.string(),
  strategyId: z.string().uuid().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

export type TradeOrder = z.infer<typeof TradeOrderSchema>;

// ====================
// Validation Helpers
// ====================

/**
 * Safely parse decision trace from database
 */
export function parseDecisionTrace(data: unknown): DecisionTrace | null {
  const result = DecisionTraceSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Decision trace validation failed:', result.error.issues);
  return null;
}

/**
 * Safely parse lifecycle transition
 */
export function parseLifecycleTransition(data: unknown): LifecycleTransition | null {
  const result = LifecycleTransitionSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Lifecycle transition validation failed:', result.error.issues);
  return null;
}

/**
 * Safely parse system health record
 */
export function parseSystemHealthRecord(data: unknown): SystemHealthRecord | null {
  const result = SystemHealthRecordSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('System health validation failed:', result.error.issues);
  return null;
}

/**
 * Validate trade order before submission
 */
export function validateTradeOrder(data: unknown): { valid: true; order: TradeOrder } | { valid: false; errors: string[] } {
  const result = TradeOrderSchema.safeParse(data);
  if (result.success) {
    return { valid: true, order: result.data };
  }
  return { 
    valid: false, 
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
  };
}

/**
 * Assert lifecycle state is valid
 */
export function assertLifecycleState(state: unknown): asserts state is LifecycleState {
  const result = LifecycleStateSchema.safeParse(state);
  if (!result.success) {
    throw new Error(`Invalid lifecycle state: ${state}`);
  }
}
