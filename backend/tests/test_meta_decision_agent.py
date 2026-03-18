"""
Tests for meta_decision_agent.py — covers initialization, decision logic,
regime classification, fail-safe, veto power, and message processing.
"""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.meta_decision_agent import (
    MetaDecisionAgent,
    MetaDecision,
    GlobalTradingState,
    StrategyState,
    RegimeType,
)
from app.agents.base_agent import AgentMessage, AgentChannel


class TestEnums:
    def test_global_trading_state_values(self):
        assert GlobalTradingState.HALTED == "halted"
        assert GlobalTradingState.REDUCE_ONLY == "reduce_only"
        assert GlobalTradingState.NORMAL == "normal"

    def test_strategy_state_values(self):
        assert StrategyState.ENABLE == "enable"
        assert StrategyState.DISABLE == "disable"
        assert StrategyState.REDUCE_SIZE == "reduce_size"

    def test_regime_type_values(self):
        assert RegimeType.TRENDING == "trending"
        assert RegimeType.CRISIS == "crisis"


class TestMetaDecision:
    def test_to_dict(self):
        d = MetaDecision(
            global_state=GlobalTradingState.NORMAL,
            strategy_states={"trend_following": StrategyState.ENABLE},
            size_multipliers={"trend_following": 1.0},
            regime=RegimeType.TRENDING,
            confidence=0.9,
            reason_codes=["conditions_normal"],
            decided_at="2025-01-01T00:00:00",
            expires_at="2025-01-01T00:01:00",
        )
        result = d.to_dict()
        assert result["global_state"] == "normal"
        assert result["strategy_states"]["trend_following"] == "enable"
        assert result["regime"] == "trending"
        assert result["confidence"] == 0.9


def _make_agent(**kwargs):
    """Create a MetaDecisionAgent with mocked Redis publish."""
    agent = MetaDecisionAgent(**kwargs)
    agent._redis = AsyncMock()
    agent._http_client = AsyncMock()
    agent._supabase_url = ""
    agent._supabase_key = ""
    return agent


class TestMetaDecisionAgentInit:
    def test_default_init(self):
        agent = MetaDecisionAgent()
        assert agent.agent_id == "meta-decision-agent-01"
        assert agent.agent_type == "meta-decision"
        assert agent._current_decision.global_state == GlobalTradingState.HALTED

    def test_custom_agent_id(self):
        agent = MetaDecisionAgent(agent_id="custom-meta")
        assert agent.agent_id == "custom-meta"

    def test_initial_decision_is_halted(self):
        agent = MetaDecisionAgent()
        d = agent._current_decision
        assert d.global_state == GlobalTradingState.HALTED
        assert d.confidence == 0.0
        assert "system_initializing" in d.reason_codes

    def test_registered_strategies(self):
        agent = MetaDecisionAgent()
        expected = [
            "trend_following",
            "mean_reversion",
            "funding_arbitrage",
            "momentum",
            "breakout",
        ]
        assert agent._registered_strategies == expected


class TestRegimeClassification:
    def test_crisis_regime(self):
        agent = MetaDecisionAgent()
        assert agent._classify_regime(0.06) == RegimeType.CRISIS

    def test_volatile_regime(self):
        agent = MetaDecisionAgent()
        assert agent._classify_regime(0.03) == RegimeType.VOLATILE

    def test_choppy_regime(self):
        agent = MetaDecisionAgent()
        assert agent._classify_regime(0.015) == RegimeType.CHOPPY

    def test_trending_regime(self):
        agent = MetaDecisionAgent()
        assert agent._classify_regime(0.005) == RegimeType.TRENDING


class TestMakeDecision:
    async def test_no_market_data_halts(self):
        agent = _make_agent()
        decision = await agent._make_decision()
        assert decision.global_state == GlobalTradingState.HALTED
        assert "no_market_data" in decision.reason_codes
        assert decision.confidence == 0.0
        # All strategies disabled
        for state in decision.strategy_states.values():
            assert state == StrategyState.DISABLE

    async def test_missing_critical_agents_halts(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.005}
        # No agent health data for critical agents
        decision = await agent._make_decision()
        assert decision.global_state == GlobalTradingState.HALTED
        assert any("agent_missing" in r for r in decision.reason_codes)

    async def test_normal_conditions(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.005}
        agent._agent_health = {
            "risk-agent-01": {"status": "running", "last_seen": datetime.utcnow().isoformat()},
            "execution-agent-01": {"status": "running", "last_seen": datetime.utcnow().isoformat()},
        }
        decision = await agent._make_decision()
        assert decision.global_state == GlobalTradingState.NORMAL
        assert decision.confidence > 0

    async def test_crisis_volatility_halts(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.06}  # > 5% crisis threshold
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        decision = await agent._make_decision()
        assert decision.global_state == GlobalTradingState.HALTED
        assert "volatility_crisis" in decision.reason_codes

    async def test_high_volatility_reduce_only(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.03}  # > 2% high threshold
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        decision = await agent._make_decision()
        assert decision.global_state == GlobalTradingState.REDUCE_ONLY
        assert "high_volatility" in decision.reason_codes
        # Size multipliers reduced
        for mult in decision.size_multipliers.values():
            assert mult == 0.25

    async def test_choppy_disables_trend_strategies(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.015}  # Choppy range
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        decision = await agent._make_decision()
        assert decision.strategy_states.get("trend_following") == StrategyState.DISABLE
        assert decision.strategy_states.get("momentum") == StrategyState.DISABLE

    async def test_degraded_liquidity_reduces_size(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.005}
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        agent._liquidity_data = {
            "BTC": {"spread": 0.005, "depth": 100},  # > 0.3% degraded
        }
        decision = await agent._make_decision()
        assert any("spread_wide" in r for r in decision.reason_codes)

    async def test_high_slippage_reduces_strategy(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.005}
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        agent._execution_quality = {
            "trend_following": {
                "fills": 10,
                "total_slippage": 0.05,
                "total_latency": 500,
                "avg_slippage": 0.005,  # > 0.2% threshold
                "avg_latency": 50,
            }
        }
        decision = await agent._make_decision()
        assert decision.strategy_states.get("trend_following") == StrategyState.REDUCE_SIZE

    async def test_excessive_critical_alerts(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.005}
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        agent._system_stress = {"critical_alerts": 5}
        decision = await agent._make_decision()
        assert decision.global_state == GlobalTradingState.REDUCE_ONLY
        assert "excessive_critical_alerts" in decision.reason_codes

    async def test_high_correlation_reduces_size(self):
        agent = _make_agent()
        agent._volatility_data = {"BTC": 0.005}
        agent._agent_health = {
            "risk-agent-01": {"status": "running"},
            "execution-agent-01": {"status": "running"},
        }
        # 3 high-correlation entries
        agent._correlation_matrix = {
            "pair_a": 0.8,
            "pair_b": 0.75,
            "pair_c": 0.9,
        }
        decision = await agent._make_decision()
        assert "high_correlation" in decision.reason_codes


class TestMessageProcessing:
    async def test_process_market_data(self):
        agent = _make_agent()
        await agent._process_market_data({
            "instrument": "BTC",
            "price": 50000,
            "price_change_1m": 250,
            "spread": 0.001,
            "depth": 100,
        })
        assert "BTC" in agent._volatility_data
        assert "BTC" in agent._liquidity_data

    async def test_process_market_data_zero_price(self):
        agent = _make_agent()
        await agent._process_market_data({
            "instrument": "X",
            "price": 0,
            "price_change_1m": 10,
        })
        # Zero price is skipped for volatility calc
        assert "X" not in agent._volatility_data

    async def test_process_heartbeat(self):
        agent = _make_agent()
        await agent._process_heartbeat({
            "agent_id": "risk-agent-01",
            "status": "running",
            "metrics": {"cycles": 100},
        })
        assert "risk-agent-01" in agent._agent_health
        assert agent._agent_health["risk-agent-01"]["status"] == "running"

    async def test_process_fill(self):
        agent = _make_agent()
        await agent._process_fill({
            "strategy": "trend_following",
            "slippage": 0.001,
            "latency_ms": 50,
        })
        eq = agent._execution_quality.get("trend_following")
        assert eq is not None
        assert eq["fills"] == 1
        assert eq["avg_slippage"] == pytest.approx(0.001)

    async def test_process_fill_accumulates(self):
        agent = _make_agent()
        await agent._process_fill({"strategy": "s1", "slippage": 0.001, "latency_ms": 10})
        await agent._process_fill({"strategy": "s1", "slippage": 0.003, "latency_ms": 20})
        eq = agent._execution_quality["s1"]
        assert eq["fills"] == 2
        assert eq["avg_slippage"] == pytest.approx(0.002)

    async def test_process_alert_critical(self):
        agent = _make_agent()
        await agent._process_alert({"severity": "critical", "source": "system"})
        assert agent._system_stress.get("critical_alerts") == 1

    async def test_process_alert_warning(self):
        agent = _make_agent()
        await agent._process_alert({"severity": "warning", "source": "system"})
        assert agent._system_stress.get("warning_alerts") == 1

    async def test_process_alert_info_no_stress(self):
        agent = _make_agent()
        await agent._process_alert({"severity": "info", "source": "system"})
        assert agent._system_stress.get("critical_alerts", 0) == 0
        assert agent._system_stress.get("warning_alerts", 0) == 0


class TestHandleMessage:
    async def test_handle_market_data_message(self):
        agent = _make_agent()
        msg = AgentMessage.create(
            source="data-feed",
            channel=AgentChannel.MARKET_DATA,
            payload={"instrument": "ETH", "price": 3000, "price_change_1m": 30},
        )
        await agent.handle_message(msg)
        assert "ETH" in agent._volatility_data

    async def test_handle_message_error_triggers_fail_safe(self):
        agent = _make_agent()

        # Corrupt the method to trigger error
        async def bad_process(*args, **kwargs):
            raise ValueError("boom")

        agent._process_market_data = bad_process

        msg = AgentMessage.create(
            source="data-feed",
            channel=AgentChannel.MARKET_DATA,
            payload={"instrument": "X"},
        )
        await agent.handle_message(msg)
        assert agent._current_decision.global_state == GlobalTradingState.HALTED
        assert "fail_safe_activated" in agent._current_decision.reason_codes


class TestVetoPower:
    def test_can_strategy_trade_halted(self):
        agent = MetaDecisionAgent()
        # Default is HALTED
        assert agent.can_strategy_trade("trend_following") is False

    def test_can_strategy_trade_normal_enabled(self):
        agent = MetaDecisionAgent()
        agent._current_decision = MetaDecision(
            global_state=GlobalTradingState.NORMAL,
            strategy_states={"trend_following": StrategyState.ENABLE},
            size_multipliers={"trend_following": 1.0},
            regime=RegimeType.TRENDING,
            confidence=1.0,
            reason_codes=["ok"],
            decided_at=datetime.utcnow().isoformat(),
            expires_at=(datetime.utcnow() + timedelta(seconds=30)).isoformat(),
        )
        assert agent.can_strategy_trade("trend_following") is True

    def test_can_strategy_trade_disabled(self):
        agent = MetaDecisionAgent()
        agent._current_decision = MetaDecision(
            global_state=GlobalTradingState.NORMAL,
            strategy_states={"trend_following": StrategyState.DISABLE},
            size_multipliers={"trend_following": 0.0},
            regime=RegimeType.CHOPPY,
            confidence=0.5,
            reason_codes=["choppy"],
            decided_at=datetime.utcnow().isoformat(),
            expires_at=(datetime.utcnow() + timedelta(seconds=30)).isoformat(),
        )
        assert agent.can_strategy_trade("trend_following") is False

    def test_can_strategy_trade_unknown_defaults_disable(self):
        agent = MetaDecisionAgent()
        agent._current_decision = MetaDecision(
            global_state=GlobalTradingState.NORMAL,
            strategy_states={},
            size_multipliers={},
            regime=RegimeType.TRENDING,
            confidence=1.0,
            reason_codes=[],
            decided_at=datetime.utcnow().isoformat(),
            expires_at=(datetime.utcnow() + timedelta(seconds=30)).isoformat(),
        )
        assert agent.can_strategy_trade("unknown_strategy") is False

    def test_get_size_multiplier(self):
        agent = MetaDecisionAgent()
        agent._current_decision = MetaDecision(
            global_state=GlobalTradingState.NORMAL,
            strategy_states={"s1": StrategyState.ENABLE},
            size_multipliers={"s1": 0.5},
            regime=RegimeType.TRENDING,
            confidence=1.0,
            reason_codes=[],
            decided_at=datetime.utcnow().isoformat(),
            expires_at=(datetime.utcnow() + timedelta(seconds=30)).isoformat(),
        )
        assert agent.get_size_multiplier("s1") == 0.5
        assert agent.get_size_multiplier("unknown") == 0.0


class TestFailSafe:
    async def test_fail_safe_halts_everything(self):
        agent = _make_agent()
        await agent._fail_safe("test_reason", "test details")
        d = agent._current_decision
        assert d.global_state == GlobalTradingState.HALTED
        assert d.confidence == 0.0
        for state in d.strategy_states.values():
            assert state == StrategyState.DISABLE
        assert "test_reason" in d.reason_codes
        assert "fail_safe_activated" in d.reason_codes


class TestCycle:
    async def test_cycle_skips_when_too_early(self):
        agent = _make_agent()
        agent._last_decision_time = datetime.utcnow()
        await agent.cycle()
        # Did not re-evaluate (no broadcast)

    async def test_cycle_makes_decision_when_interval_elapsed(self):
        agent = _make_agent()
        agent._last_decision_time = datetime.utcnow() - timedelta(seconds=10)
        # No market data -> HALTED
        await agent.cycle()
        assert agent._current_decision.global_state == GlobalTradingState.HALTED


class TestLifecycleHooks:
    async def test_on_start(self):
        agent = _make_agent()
        await agent.on_start()  # Should not raise

    async def test_on_pause_triggers_fail_safe(self):
        agent = _make_agent()
        await agent.on_pause()
        assert agent._current_decision.global_state == GlobalTradingState.HALTED

    async def test_on_resume(self):
        agent = _make_agent()
        await agent.on_resume()  # Should not raise

    def test_get_current_decision(self):
        agent = MetaDecisionAgent()
        d = agent.get_current_decision()
        assert isinstance(d, MetaDecision)
