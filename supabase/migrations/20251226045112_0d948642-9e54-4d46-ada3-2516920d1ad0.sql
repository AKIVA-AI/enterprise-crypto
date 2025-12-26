-- Set REPLICA IDENTITY FULL for all key tables
ALTER TABLE public.venue_health REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.positions REPLICA IDENTITY FULL;
ALTER TABLE public.meme_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.books REPLICA IDENTITY FULL;
ALTER TABLE public.strategies REPLICA IDENTITY FULL;

-- Add remaining tables to realtime publication (if not already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_health;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meme_metrics;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.strategies;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;