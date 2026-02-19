
-- Create arbitrage_state table to persist daily P&L and kill switch state
CREATE TABLE IF NOT EXISTS public.arbitrage_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_key text NOT NULL UNIQUE,
  state_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arbitrage_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages arbitrage state"
  ON public.arbitrage_state FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin/CIO can view arbitrage state"
  ON public.arbitrage_state FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cio'::app_role, 'trader'::app_role, 'ops'::app_role]));

INSERT INTO public.arbitrage_state (state_key, state_value)
VALUES 
  ('daily_pnl', '{"pnl": 0, "limit": -500, "date": "", "warning_70_sent": false, "warning_90_sent": false}'::jsonb),
  ('kill_switch', '{"active": false, "reason": "", "activated_at": null}'::jsonb),
  ('daily_stats', '{"trades_executed": 0, "total_profit": 0, "total_loss": 0, "win_count": 0, "loss_count": 0, "max_drawdown": 0, "peak_pnl": 0}'::jsonb),
  ('position_sizing', '{"base_size": 0.1, "min_size": 0.01, "max_size": 0.5, "scale_down_at_70": true, "scale_down_at_90": true}'::jsonb)
ON CONFLICT (state_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_market_snapshots_latest 
  ON public.market_snapshots (venue_id, instrument, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_old_market_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.market_snapshots
  WHERE recorded_at < now() - INTERVAL '7 days';
END;
$$;
