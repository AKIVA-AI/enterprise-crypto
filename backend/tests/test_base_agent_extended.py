"""
Extended tests for base_agent.py — covers uncovered code paths:
AgentMessage roundtrip, behavior versioning, drift metrics, signed channel
verification, message queue overflow, flush, send_alert, _mark_stopped,
_heartbeat_loop, and record_* methods.
"""

import asyncio
import json
from datetime import datetime, UTC
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.base_agent import (
    AgentMessage,
    AgentChannel,
    AgentBehaviorVersion,
    AgentDriftMetrics,
    BaseAgent,
    AGENT_BEHAVIOR_VERSION,
)


# Concrete implementation for testing
class _StubAgent(BaseAgent):
    """Minimal concrete agent for testing base class behaviour."""

    def __init__(self, **kwargs):
        super().__init__(
            agent_id=kwargs.get("agent_id", "stub-agent-01"),
            agent_type=kwargs.get("agent_type", "stub"),
            redis_url=kwargs.get("redis_url", "redis://localhost:6379"),
            subscribed_channels=kwargs.get("subscribed_channels"),
            capabilities=kwargs.get("capabilities", ["cap_a", "cap_b"]),
        )
        self.handled_messages: list = []

    async def handle_message(self, message: AgentMessage):
        self.handled_messages.append(message)

    async def cycle(self):
        pass


# ── AgentMessage ──


class TestAgentMessage:
    def test_create_and_roundtrip(self):
        msg = AgentMessage.create(
            source="agent-a",
            channel=AgentChannel.SIGNALS,
            payload={"signal": "buy"},
            target="agent-b",
        )
        assert msg.source_agent == "agent-a"
        assert msg.target_agent == "agent-b"
        assert msg.channel == AgentChannel.SIGNALS.value
        assert msg.payload == {"signal": "buy"}
        assert msg.correlation_id is not None

        json_str = msg.to_json()
        restored = AgentMessage.from_json(json_str)
        assert restored.id == msg.id
        assert restored.source_agent == msg.source_agent
        assert restored.target_agent == msg.target_agent
        assert restored.channel == msg.channel
        assert restored.payload == msg.payload
        assert restored.correlation_id == msg.correlation_id

    def test_create_without_target_or_correlation(self):
        msg = AgentMessage.create(
            source="agent-a",
            channel=AgentChannel.MARKET_DATA,
            payload={"price": 100},
        )
        assert msg.target_agent is None
        assert msg.correlation_id is not None  # auto-generated UUID

    def test_from_json_with_signature(self):
        msg = AgentMessage.create(
            source="a", channel=AgentChannel.ALERTS, payload={}
        )
        msg.signature = "some-sig"
        restored = AgentMessage.from_json(msg.to_json())
        assert restored.signature == "some-sig"


# ── AgentBehaviorVersion ──


class TestAgentBehaviorVersion:
    def test_fields(self):
        bv = AgentBehaviorVersion(
            version="1.0.0",
            prompt_hash="abc123",
            tools=["tool1"],
            model="rule-based",
            changed_at="2025-01-01T00:00:00",
        )
        assert bv.version == "1.0.0"
        assert bv.prompt_hash == "abc123"
        assert bv.tools == ["tool1"]
        assert bv.model == "rule-based"


# ── AgentDriftMetrics ──


class TestAgentDriftMetrics:
    def test_defaults(self):
        dm = AgentDriftMetrics()
        assert dm.override_count == 0
        assert dm.total_decisions == 0

    def test_override_rate_zero_decisions(self):
        dm = AgentDriftMetrics()
        assert dm.override_rate == 0.0
        assert dm.fallback_rate == 0.0
        assert dm.approval_rate == 0.0

    def test_rates_with_data(self):
        dm = AgentDriftMetrics(
            override_count=2,
            fallback_count=1,
            approval_count=7,
            rejection_count=3,
            total_decisions=10,
        )
        assert dm.override_rate == pytest.approx(0.2)
        assert dm.fallback_rate == pytest.approx(0.1)
        assert dm.approval_rate == pytest.approx(0.7)

    def test_to_dict(self):
        dm = AgentDriftMetrics(total_decisions=4, approval_count=3, override_count=1)
        d = dm.to_dict()
        assert d["total_decisions"] == 4
        assert d["approval_count"] == 3
        assert d["override_rate"] == 0.25
        assert d["approval_rate"] == 0.75


# ── BaseAgent drift recording ──


class TestBaseAgentDrift:
    def test_record_decision_approved(self):
        agent = _StubAgent()
        agent.record_decision(approved=True)
        assert agent._drift.total_decisions == 1
        assert agent._drift.approval_count == 1
        assert agent._drift.rejection_count == 0

    def test_record_decision_rejected(self):
        agent = _StubAgent()
        agent.record_decision(approved=False)
        assert agent._drift.total_decisions == 1
        assert agent._drift.rejection_count == 1

    def test_record_override(self):
        agent = _StubAgent()
        agent.record_override()
        assert agent._drift.override_count == 1
        assert agent._drift.total_decisions == 1

    def test_record_fallback(self):
        agent = _StubAgent()
        agent.record_fallback()
        assert agent._drift.fallback_count == 1
        # record_fallback does NOT increment total_decisions (matches source)

    def test_get_behavior_info(self):
        agent = _StubAgent()
        info = agent.get_behavior_info()
        assert "behavior_version" in info
        assert "drift" in info
        bv = info["behavior_version"]
        assert bv["version"] == AGENT_BEHAVIOR_VERSION
        assert bv["tools"] == ["cap_a", "cap_b"]
        assert bv["model"] == "rule-based"


# ── Signed channel verification in _process_message ──


class TestSignedChannelVerification:
    async def test_valid_signature_passes(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        # Create a properly signed message
        msg = AgentMessage.create(
            source="stub-agent-01",
            channel=AgentChannel.EXECUTION,
            payload={"trade": "BTC"},
        )
        msg.signature = agent._identity.sign_message(
            AgentMessage(
                id=msg.id,
                timestamp=msg.timestamp,
                source_agent=msg.source_agent,
                target_agent=msg.target_agent,
                channel=msg.channel,
                payload=msg.payload,
                correlation_id=msg.correlation_id,
                signature=None,
            ).to_json()
        )

        raw = {
            "type": "message",
            "channel": AgentChannel.EXECUTION.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._metrics["messages_received"] == 1
        assert len(agent.handled_messages) == 1

    async def test_invalid_signature_rejected(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="evil-agent",
            channel=AgentChannel.EXECUTION,
            payload={"steal": True},
        )
        msg.signature = "0:badhexsig"

        raw = {
            "type": "message",
            "channel": AgentChannel.EXECUTION.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._metrics["signature_failures"] == 1
        assert len(agent.handled_messages) == 0

    async def test_non_signed_channel_skips_verification(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="other-agent",
            channel=AgentChannel.MARKET_DATA,
            payload={"price": 50000},
        )
        # No signature at all
        raw = {
            "type": "message",
            "channel": AgentChannel.MARKET_DATA.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._metrics["messages_received"] == 1
        assert len(agent.handled_messages) == 1

    async def test_non_message_type_ignored(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        raw = {"type": "subscribe", "channel": "test", "data": "{}"}
        await agent._process_message(raw)
        assert agent._metrics["messages_received"] == 0

    async def test_bytes_channel_and_data_decoded(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="other",
            channel=AgentChannel.MARKET_DATA,
            payload={"price": 1},
        )
        raw = {
            "type": "message",
            "channel": AgentChannel.MARKET_DATA.value.encode(),
            "data": msg.to_json().encode(),
        }
        await agent._process_message(raw)
        assert agent._metrics["messages_received"] == 1

    async def test_malformed_data_increments_errors(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        raw = {
            "type": "message",
            "channel": AgentChannel.MARKET_DATA.value,
            "data": "not-valid-json{{{",
        }
        await agent._process_message(raw)
        assert agent._metrics["errors"] == 1


# ── Control message handling ──


class TestControlMessages:
    async def test_shutdown_command(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="controller",
            channel=AgentChannel.CONTROL,
            payload={"command": "shutdown"},
        )
        raw = {
            "type": "message",
            "channel": AgentChannel.CONTROL.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._running is False

    async def test_pause_command(self):
        agent = _StubAgent()
        agent._running = True
        agent._paused = False
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="ctrl",
            channel=AgentChannel.CONTROL,
            payload={"command": "pause"},
        )
        raw = {
            "type": "message",
            "channel": AgentChannel.CONTROL.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._paused is True

    async def test_resume_command(self):
        agent = _StubAgent()
        agent._running = True
        agent._paused = True
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="ctrl",
            channel=AgentChannel.CONTROL,
            payload={"command": "resume"},
        )
        raw = {
            "type": "message",
            "channel": AgentChannel.CONTROL.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._paused is False

    async def test_control_for_other_agent_ignored(self):
        agent = _StubAgent()
        agent._running = True
        agent._paused = False
        agent._message_handlers = {}

        msg = AgentMessage.create(
            source="ctrl",
            channel=AgentChannel.CONTROL,
            payload={"command": "shutdown", "target": "other-agent"},
        )
        raw = {
            "type": "message",
            "channel": AgentChannel.CONTROL.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert agent._running is True  # Not shut down


# ── Message queue overflow ──


class TestMessageQueueOverflow:
    async def test_queue_message_when_redis_unavailable(self):
        agent = _StubAgent()
        agent._redis = None
        await agent.publish(AgentChannel.SIGNALS, {"data": "test"})
        assert len(agent._message_queue) == 1

    async def test_queue_overflow_drops_message(self):
        agent = _StubAgent()
        agent._redis = None
        agent._message_queue = [("ch", {}, None)] * 1000  # Fill queue
        await agent.publish(AgentChannel.SIGNALS, {"data": "overflow"})
        assert len(agent._message_queue) == 1000  # Not 1001


# ── _flush_message_queue ──


class TestFlushMessageQueue:
    async def test_flush_empty_queue(self):
        agent = _StubAgent()
        await agent._flush_message_queue()
        # No error, no-op

    async def test_flush_with_messages(self):
        agent = _StubAgent()
        mock_redis = AsyncMock()
        agent._redis = mock_redis
        agent._message_queue = [
            (AgentChannel.SIGNALS, {"sig": 1}, "corr1"),
            (AgentChannel.ALERTS, {"alert": 2}, "corr2"),
        ]
        await agent._flush_message_queue()
        assert len(agent._message_queue) == 0
        assert mock_redis.publish.call_count == 2

    async def test_flush_handles_publish_error(self):
        agent = _StubAgent()
        mock_redis = AsyncMock()
        mock_redis.publish.side_effect = Exception("Redis error")
        agent._redis = mock_redis
        agent._message_queue = [
            (AgentChannel.SIGNALS, {"sig": 1}, "corr1"),
        ]
        await agent._flush_message_queue()
        # Queue item was popped but publish failed, loop breaks
        # Remaining items stay in queue (in this case 0 left since pop happened first)


# ── send_alert ──


class TestSendAlert:
    async def test_send_alert_publishes_and_persists(self):
        agent = _StubAgent()
        mock_redis = AsyncMock()
        agent._redis = mock_redis
        agent._supabase_url = "https://test.supabase.co"
        agent._supabase_key = "test-key"
        mock_http = AsyncMock()
        agent._http_client = mock_http

        await agent.send_alert(
            "critical",
            "Test Alert",
            "Something broke",
            {"key": "val"},
        )

        # Verify Redis publish happened
        assert mock_redis.publish.called

        # Verify Supabase persistence
        assert mock_http.post.called
        call_args = mock_http.post.call_args
        assert "/rest/v1/alerts" in call_args[0][0]

    async def test_send_alert_no_supabase(self):
        agent = _StubAgent()
        mock_redis = AsyncMock()
        agent._redis = mock_redis
        agent._supabase_url = ""
        agent._supabase_key = ""
        agent._http_client = None

        # Should not raise even without Supabase
        await agent.send_alert("warning", "Test", "msg")
        assert mock_redis.publish.called

    async def test_send_alert_supabase_error_handled(self):
        agent = _StubAgent()
        mock_redis = AsyncMock()
        agent._redis = mock_redis
        agent._supabase_url = "https://test.supabase.co"
        agent._supabase_key = "key"
        mock_http = AsyncMock()
        mock_http.post.side_effect = Exception("Network error")
        agent._http_client = mock_http

        # Should not propagate exception
        await agent.send_alert("critical", "Fail", "details")


# ── _mark_stopped ──


class TestMarkStopped:
    async def test_mark_stopped_sends_patch(self):
        agent = _StubAgent()
        agent._supabase_url = "https://test.supabase.co"
        agent._supabase_key = "key"
        mock_http = AsyncMock()
        agent._http_client = mock_http

        await agent._mark_stopped()
        assert mock_http.patch.called
        call_args = mock_http.patch.call_args
        assert "agents" in call_args[0][0]
        assert call_args[1]["json"] == {"status": "stopped"}

    async def test_mark_stopped_no_supabase(self):
        agent = _StubAgent()
        agent._supabase_url = ""
        agent._supabase_key = ""
        agent._http_client = None
        # Should not raise
        await agent._mark_stopped()

    async def test_mark_stopped_error_handled(self):
        agent = _StubAgent()
        agent._supabase_url = "https://test.supabase.co"
        agent._supabase_key = "key"
        mock_http = AsyncMock()
        mock_http.patch.side_effect = Exception("fail")
        agent._http_client = mock_http
        # Should not propagate
        await agent._mark_stopped()


# ── _heartbeat_loop ──


class TestHeartbeatLoop:
    async def test_heartbeat_loop_sends_and_stops(self):
        agent = _StubAgent()
        agent._running = True
        mock_redis = AsyncMock()
        agent._redis = mock_redis
        agent._supabase_url = ""
        agent._supabase_key = ""

        call_count = 0
        original_sleep = asyncio.sleep

        async def fake_sleep(seconds):
            nonlocal call_count
            call_count += 1
            if call_count >= 2:
                agent._running = False
            await original_sleep(0)

        with patch("asyncio.sleep", side_effect=fake_sleep):
            await agent._heartbeat_loop()

        # Heartbeat was sent at least once
        assert mock_redis.publish.called


# ── publish with redis connection error ──


class TestPublishResilience:
    async def test_publish_queues_on_connection_error(self):
        import redis.asyncio as aioredis

        agent = _StubAgent()
        mock_redis = AsyncMock()
        mock_redis.publish.side_effect = aioredis.ConnectionError("lost")
        agent._redis = mock_redis

        # Mock _attempt_reconnect to be no-op
        agent._attempt_reconnect = AsyncMock()

        await agent.publish(AgentChannel.SIGNALS, {"test": 1})
        assert len(agent._message_queue) == 1
        assert agent._attempt_reconnect.called


# ── Registered handler dispatch ──


class TestRegisteredHandlerDispatch:
    async def test_registered_handler_called(self):
        agent = _StubAgent()
        agent._running = True
        agent._message_handlers = {}

        handler_called = []

        async def custom_handler(msg):
            handler_called.append(msg)

        agent.register_handler(AgentChannel.SIGNALS, custom_handler)

        msg = AgentMessage.create(
            source="other",
            channel=AgentChannel.SIGNALS,
            payload={"test": True},
        )
        raw = {
            "type": "message",
            "channel": AgentChannel.SIGNALS.value,
            "data": msg.to_json(),
        }
        await agent._process_message(raw)
        assert len(handler_called) == 1
        assert len(agent.handled_messages) == 0  # default handler NOT called
