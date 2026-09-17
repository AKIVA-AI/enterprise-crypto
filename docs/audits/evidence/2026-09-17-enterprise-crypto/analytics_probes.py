"""Local numerical/reconciliation probes. No provider access or trained models."""

import argparse
import asyncio
import contextlib
import io
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

parser = argparse.ArgumentParser()
parser.add_argument("--repo", type=Path, required=True)
root = parser.parse_args().repo.resolve()
sys.dont_write_bytecode = True
sys.path[:0] = [str(root / "backend"), str(root / ".radar/audit-20260917")]
os.environ.update(
    PYTHON_DOTENV_DISABLED="1",
    ENVIRONMENT="production",
    PAPER_TRADING="false",
    SUPABASE_URL="http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY="audit-placeholder",
)
import numpy as np
import pandas as pd
import sitecustomize  # noqa: E402,F401
from app.config import settings
from app.models.backtest_result import EquityPoint
from app.services.enhanced_signal_engine import EnhancedSignalEngine
from app.services.institutional_backtester import (
    BacktestConfig,
    InstitutionalBacktester,
)
from app.services.live_reconciliation import LiveReconciliationService
from app.services.walk_forward_engine import WalkForwardConfig, WalkForwardEngine

observed = {}
start = datetime(2026, 1, 1)
cfg = BacktestConfig(
    strategy_name="fixture",
    instruments=["BTC-USD"],
    start_date=start,
    end_date=start + timedelta(days=10),
    initial_capital=1000,
    commission_bps=0,
    slippage_bps=0,
)


async def probes():
    engine = InstitutionalBacktester(cfg)
    engine._cash = 1000
    engine._open_position("BTC-USD", "short", start, 100)
    engine._close_position("BTC-USD", start + timedelta(hours=1), 90)
    assert engine._cash == 990 and engine._trades[0].pnl == 10
    observed["short_trade_profit_disagrees_with_cash"] = {
        "initial_cash": 1000,
        "entry_price": 100,
        "exit_price": 90,
        "trade_pnl": engine._trades[0].pnl,
        "ending_cash": engine._cash,
        "expected_ending_cash": 1010,
    }

    class Hold:
        def populate_indicators(self, data, metadata):
            return data

        def populate_entry_trend(self, data, metadata):
            data["enter_long"] = 1
            return data

        def populate_exit_trend(self, data, metadata):
            data["exit_long"] = 0
            return data

    fee_config = BacktestConfig(
        strategy_name="fixture",
        instruments=["BTC-USD"],
        start_date=start,
        end_date=start + timedelta(days=10),
        initial_capital=1000,
        commission_bps=100,
        slippage_bps=0,
    )
    fee_engine = InstitutionalBacktester(fee_config)
    frame = pd.DataFrame(
        {
            "date": pd.date_range(start, periods=4, freq="h"),
            "open": 100.0,
            "high": 100.0,
            "low": 100.0,
            "close": 100.0,
            "volume": 100.0,
        }
    )
    result = fee_engine._run_single_backtest(Hold(), frame, "fixture")
    assert result["equity"][-1].equity > fee_engine._cash
    assert abs(result["trades"][0].pnl - (fee_engine._cash - 1000)) > 0.4
    observed["final_equity_omits_liquidation_fee_and_trade_pnl_omits_entry_fee"] = {
        "last_equity": result["equity"][-1].equity,
        "ending_cash": fee_engine._cash,
        "trade_pnl": result["trades"][0].pnl,
        "cash_pnl": fee_engine._cash - 1000,
        "trade_total_fees": result["trades"][0].fees,
    }

    recon = await LiveReconciliationService()._reconcile_single_order(
        {
            "id": "local-id",
            "venue_order_id": "venue-id",
            "status": "open",
            "filled_size": 0,
        },
        {"venue-id": {"id": "venue-id", "status": "open", "filled_quantity": 0}},
        [],
        "fixture",
    )
    assert recon.venue_status == "not_found"
    observed["reconciliation_matches_local_id_instead_of_venue_id"] = {
        "internal_id": "local-id",
        "stored_venue_order_id": "venue-id",
        "venue_order_present": True,
        "observed_venue_status": recon.venue_status,
    }

    client = MagicMock()
    query = client.table.return_value
    for method in ["select", "eq", "order", "limit"]:
        getattr(query, method).return_value = query
    query.execute.return_value = SimpleNamespace(data=[])
    np.random.seed(7)
    with patch("app.services.enhanced_signal_engine.get_supabase", return_value=client):
        data = await EnhancedSignalEngine().fetch_market_data(
            "BTC-USD", timeframe="5m", limit=30
        )
    minutes = (data.recorded_at.iloc[1] - data.recorded_at.iloc[0]).total_seconds() / 60
    assert (
        len(data) == 30
        and minutes == 60
        and "data_quality" not in data.columns
        and not settings.is_paper_mode
    )
    observed["live_mode_market_gap_yields_untagged_hourly_synthetic_data"] = {
        "effective_paper_mode": settings.is_paper_mode,
        "requested_timeframe": "5m",
        "returned_interval_minutes": minutes,
        "rows": len(data),
        "data_quality_column_present": False,
    }

    captured = {}

    class WindowDouble:
        def __init__(self, config):
            pass

        def run_backtest(self, strategy, window):
            return SimpleNamespace(
                equity_curve=[
                    EquityPoint(
                        timestamp=row.date,
                        equity=1000,
                        drawdown=0,
                        position_value=0,
                        cash=1000,
                    )
                    for row in window.itertuples()
                ],
                trades=[],
            )

    walk = WalkForwardEngine(
        WalkForwardConfig(
            train_window=4, test_window=2, step_size=2, initial_capital=1000
        )
    )
    walk.metrics_calculator.calculate_all = lambda equity, trades, capital: (
        captured.update(timestamps=[point.timestamp for point in equity])
    )
    larger = pd.DataFrame({"date": pd.date_range(start, periods=10, freq="h")})
    with patch(
        "app.services.walk_forward_engine.InstitutionalBacktester", WindowDouble
    ):
        output = walk.run(None, larger, cfg)
    timestamps = captured["timestamps"]
    assert len(timestamps) == 18 and len(set(timestamps)) == 10
    observed[
        "walk_forward_aggregate_concatenates_overlapping_train_and_test_windows"
    ] = {
        "windows": output.total_windows,
        "aggregate_points": len(timestamps),
        "unique_timestamps": len(set(timestamps)),
        "expected_out_of_sample_points": 6,
    }


with contextlib.redirect_stdout(io.StringIO()):
    asyncio.run(probes())
print(
    json.dumps(
        {
            "source": "e603ddd7bb908d24321a640ba1ac646e5b043600",
            "probe_count": len(observed),
            "observed": observed,
        },
        indent=2,
    )
)
