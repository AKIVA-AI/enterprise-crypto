"""Bounded engineering probes; all exchanges and databases are local doubles."""

import argparse
import asyncio
import contextlib
import io
import json
import os
import sys
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

parser = argparse.ArgumentParser()
parser.add_argument("--repo", required=True, type=Path)
root = parser.parse_args().repo.resolve()
sys.dont_write_bytecode = True
sys.path[:0] = [str(root / "backend"), str(root / ".radar/audit-20260917")]
os.environ.update(
    PYTHON_DOTENV_DISABLED="1",
    PAPER_TRADING="true",
    SUPABASE_URL="http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY="audit-placeholder",
)
import sitecustomize  # noqa: E402,F401
from app.adapters.coinbase_adapter import CoinbaseAdapter
from app.models.domain import (
    Book,
    BookType,
    Order,
    OrderSide,
    OrderStatus,
    Position,
    RiskCheckResult,
    RiskDecision,
    TradeIntent,
)
from app.models.opportunity import ExecutionLeg, ExecutionPlan
from app.services.execution_planner import ExecutionPlanner
from app.services.oms_execution import OMSExecutionService
from app.services.order_gateway import OrderGateway, OrderRequest
from app.services.portfolio_engine import PortfolioEngine
from app.services.risk_engine import RiskEngine

observed = {}
book = Book(
    id=uuid4(),
    name="audit",
    type=BookType.PROP,
    capital_allocated=100000,
    current_exposure=0,
    max_drawdown_limit=10,
)


def intent(**overrides):
    data = dict(
        id=uuid4(),
        book_id=book.id,
        strategy_id=uuid4(),
        instrument="BTC-USD",
        direction=OrderSide.BUY,
        target_exposure_usd=1000,
        max_loss_usd=10,
        confidence=1,
    )
    data.update(overrides)
    return TradeIntent(**data)


def query(data=None):
    client = MagicMock()
    builder = MagicMock()
    for method in [
        "select",
        "eq",
        "limit",
        "single",
        "update",
        "upsert",
        "insert",
        "ilike",
    ]:
        getattr(builder, method).return_value = builder
    builder.execute.return_value = SimpleNamespace(data=data, count=0)
    client.table.return_value = builder
    return client, builder


async def probes():
    service = OMSExecutionService()
    service._get_venue_health = AsyncMock(return_value=None)
    service._get_book_positions = AsyncMock(return_value=[])
    service._check_execution_costs = AsyncMock(return_value={"allowed": True})
    service._get_venue_id = AsyncMock(return_value=uuid4())
    service._save_order = AsyncMock()
    sent = []

    async def execute(order):
        sent.append(order.model_copy(deep=True))
        order.venue_order_id = "venue-ack-1"
        return order

    adapter = SimpleNamespace(
        place_order=AsyncMock(side_effect=execute),
        cancel_order=AsyncMock(return_value=True),
    )
    service.register_adapter("audit", adapter)
    with (
        patch(
            "app.services.oms_execution.check_kill_switch_for_trading",
            AsyncMock(return_value=(True, "ok")),
        ),
        patch(
            "app.services.oms_execution.portfolio_engine.get_book",
            AsyncMock(return_value=book),
        ),
        patch(
            "app.services.oms_execution.portfolio_engine.update_book_exposure",
            AsyncMock(),
        ),
        patch(
            "app.services.oms_execution.risk_engine.check_intent",
            AsyncMock(return_value=RiskCheckResult(decision=RiskDecision.APPROVE)),
        ),
    ):
        request = intent()
        first = await service.execute_intent(request, uuid4(), "audit")
        assert first.size == 1000
        observed["usd_notional_used_as_base_quantity"] = {
            "target_exposure_usd": 1000,
            "adapter_order_size": first.size,
            "base_quantity_at_fixture_price_50000": 0.02,
        }
        second = await service.execute_intent(request, uuid4(), "audit")
        assert second.id != first.id and len(sent) == 2
        observed["same_intent_executes_twice"] = {
            "venue_submissions": len(sent),
            "different_client_order_ids": True,
        }
        manual = await service.place_order(
            book_id=book.id,
            venue_name="audit",
            instrument="ETH-USD",
            side=OrderSide.BUY,
            size=2,
            price=100,
            order_type="limit",
        )
        assert (
            manual.order_type == "market"
            and manual.price is None
            and manual.size == 200
        )
        observed["manual_limit_order_contract_lost"] = {
            "requested_size": 2,
            "requested_price": 100,
            "requested_type": "limit",
            "submitted_size": manual.size,
            "submitted_price": manual.price,
            "submitted_type": manual.order_type,
        }

        async def filled(order):
            order.status = OrderStatus.FILLED
            order.filled_size = order.size
            order.filled_price = 100
            order.venue_order_id = "filled-at-venue"
            return order

        adapter.place_order.side_effect = filled
        service._save_order = AsyncMock(
            side_effect=[OSError("fixture persistence failure"), None]
        )
        result = await service.execute_intent(intent(), uuid4(), "audit")
        assert result.status == OrderStatus.REJECTED and result.filled_size > 0
        observed["filled_order_relabelled_rejected_after_save_error"] = {
            "status": result.status.value,
            "filled_size": result.filled_size,
            "save_attempts": service._save_order.await_count,
        }

    client, builder = query()
    persisted = Order(
        id=uuid4(),
        book_id=book.id,
        instrument="BTC-USD",
        side=OrderSide.BUY,
        size=1,
        venue_order_id="real-venue-id",
    )
    with patch("app.services.oms_execution.get_supabase", return_value=client):
        await OMSExecutionService()._save_order(persisted)
    payload = builder.upsert.call_args.args[0]
    assert "venue_order_id" not in payload
    observed["oms_drops_venue_order_id"] = {
        "input_venue_order_id": persisted.venue_order_id,
        "stored_venue_order_id": payload.get("venue_order_id"),
    }
    builder.execute.return_value = SimpleNamespace(data=payload)
    with patch("app.services.oms_execution.get_supabase", return_value=client):
        cancelled = await service.cancel_order(persisted.id, "audit")
    assert cancelled and adapter.cancel_order.await_count == 0
    observed["oms_cancel_without_persisted_id_skips_venue"] = {
        "success": cancelled,
        "venue_cancel_calls": adapter.cancel_order.await_count,
    }

    pos = Position(
        book_id=book.id,
        instrument="BTC-USD",
        side=OrderSide.BUY,
        size=0.01,
        entry_price=50000,
        mark_price=50000,
    )
    reducing = service._is_reducing_order(
        intent(direction=OrderSide.SELL, target_exposure_usd=10000), [pos]
    )
    assert reducing
    observed["reduce_only_accepts_position_flip"] = {
        "existing_notional": 500,
        "proposed_opposite_notional": 10000,
        "classified_reducing": reducing,
    }

    portfolio = PortfolioEngine()
    portfolio._books_cache[book.id] = book
    with (
        patch("app.services.oms_execution.get_supabase", return_value=client),
        patch("app.services.oms_execution.create_alert", AsyncMock()),
    ):
        await service.set_reduce_only(book.id, "fixture")
    cached = await portfolio.get_book(book.id)
    assert cached.status == "active"
    observed["book_cache_does_not_observe_external_freeze"] = {
        "cached_status_after_db_update": cached.status,
        "cache_has_expiry": False,
    }

    risk = RiskEngine()
    empty, _ = query([])
    with patch("app.services.risk_engine.get_supabase", return_value=empty):
        kill = await risk._check_global_kill_switch()
    assert kill is False
    with patch(
        "app.services.risk_engine.get_supabase",
        side_effect=OSError("fixture DB unavailable"),
    ):
        pnl = await risk._get_daily_pnl(book.id)
    assert pnl == 0
    observed["risk_missing_control_data_is_permissive"] = {
        "empty_settings_kill_switch_active": kill,
        "failed_pnl_read_returns": pnl,
    }
    with (
        patch.object(risk, "_check_global_kill_switch", AsyncMock(return_value=False)),
        patch.object(risk, "_get_daily_pnl", AsyncMock(return_value=0)),
    ):
        invalid = await risk.check_intent(
            intent(target_exposure_usd=float("nan"), max_loss_usd=float("nan")), book
        )
    assert invalid.decision == RiskDecision.APPROVE
    observed["nonfinite_intent_approved"] = {
        "target_exposure": "NaN",
        "max_loss": "NaN",
        "decision": invalid.decision.value,
    }
    pnl_db, pnl_query = query([{"unrealized_pnl": 0, "realized_pnl": -100}])
    with patch("app.services.risk_engine.get_supabase", return_value=pnl_db):
        await risk._get_daily_pnl(book.id)
    observed["daily_pnl_query_excludes_closed_and_has_no_date_filter"] = {
        "filters": [list(call.args) for call in pnl_query.eq.call_args_list],
        "date_filter_calls": pnl_query.gte.call_count,
    }

    planner = ExecutionPlanner()
    planner._record_action = AsyncMock()
    plan = ExecutionPlan(
        legs=[
            ExecutionLeg(venue="one", instrument="BTC-USD", side=OrderSide.BUY, size=2),
            ExecutionLeg(
                venue="two", instrument="BTC-USD", side=OrderSide.SELL, size=2
            ),
        ]
    )
    first_calls, second_calls = [], []

    async def first_leg(order):
        first_calls.append({"side": order.side.value, "size": order.size})
        order.status = OrderStatus.FILLED
        order.filled_size = order.size
        order.filled_price = 100
        return order

    async def reject_leg(order):
        second_calls.append({"side": order.side.value, "size": order.size})
        order.status = OrderStatus.REJECTED
        return order

    await planner.execute_plan(
        intent(),
        plan,
        {
            "one": SimpleNamespace(place_order=first_leg),
            "two": SimpleNamespace(place_order=reject_leg),
        },
        AsyncMock(),
    )
    assert len(second_calls) == 2 and second_calls[1]["side"] == "buy"
    observed["unwind_submits_reverse_order_for_rejected_zero_fill"] = {
        "rejected_venue_orders": second_calls.copy(),
        "first_venue_orders": first_calls.copy(),
    }
    first_calls.clear()
    await planner.execute_plan(
        intent(),
        plan,
        {"one": SimpleNamespace(place_order=first_leg)},
        AsyncMock(side_effect=OSError("fixture save failure")),
    )
    assert len(first_calls) == 1
    observed["planner_loses_filled_leg_when_persistence_fails"] = {
        "venue_submissions": first_calls,
        "unwind_submissions": 0,
    }
    sizes = []

    async def partial(order):
        sizes.append(order.size)
        order.status = OrderStatus.PARTIAL
        order.filled_size = order.size / 4
        order.filled_price = 100
        return order

    await planner.execute_plan(
        intent(),
        plan,
        {
            "one": SimpleNamespace(place_order=partial),
            "two": SimpleNamespace(place_order=partial),
        },
        AsyncMock(),
    )
    assert sizes == [2, 2]
    observed["next_leg_ignores_partial_fill_size"] = {
        "first_requested": sizes[0],
        "first_filled": 0.5,
        "second_requested": sizes[1],
    }

    gateway = OrderGateway()
    gateway._initialized = True
    gateway._check_kill_switch = AsyncMock(return_value=False)
    gateway._check_book_active = AsyncMock(return_value=True)
    gateway._write_order = AsyncMock(return_value=False)
    gateway._update_position = AsyncMock()
    gateway._log_audit_event = AsyncMock()
    request = OrderRequest(
        book_id=book.id, instrument="BTC-USD", side="buy", size=Decimal("1")
    )
    result = await gateway.submit_and_execute(
        request, AsyncMock(return_value=(Decimal("1"), Decimal("100"), "venue-1"))
    )
    assert result.success
    observed["alternate_gateway_ignores_persistence_failure"] = {
        "success": result.success,
        "write_success": False,
        "production_callers_found": False,
    }

    coinbase = CoinbaseAdapter()
    coinbase._authenticated_request = AsyncMock(
        return_value={"success": True, "success_response": {"order_id": "venue-123"}}
    )
    order = await coinbase._place_live_order(
        Order(
            id=uuid4(),
            book_id=book.id,
            instrument="ETH-USD",
            side=OrderSide.BUY,
            size=2,
        )
    )
    config = coinbase._authenticated_request.call_args.args[2]
    assert (
        config["order_configuration"]["market_market_ioc"]["quote_size"] == "100000.0"
        and order.venue_order_id is None
    )
    observed["coinbase_default_price_and_nested_ack"] = {
        "instrument": "ETH-USD",
        "requested_base_size": 2,
        "quote_size_sent": config["order_configuration"]["market_market_ioc"][
            "quote_size"
        ],
        "nested_order_id_saved": order.venue_order_id,
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
