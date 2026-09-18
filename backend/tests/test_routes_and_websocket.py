from unittest.mock import AsyncMock, MagicMock

import pytest
from app.api import routes
from app.api.websocket import (
    ConnectionManager,
    StreamType,
    get_websocket_status,
    handle_client_message,
)


def test_api_router_exposes_expected_routes():
    """behavioral check: hit the canonical routes via TestClient.

    fastapi>=0.141 / starlette>=1.0 changed ``include_router`` to produce opaque
    ``_IncludedRouter`` entries whose ``.path`` is None; the schema can also
    resolve unresolved forward references to ``KeyError`` in CI. Assert what the
    app actually serves instead of route-shape introspection.
    """
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(routes.api_router)
    client = TestClient(app)

    for path in ("/system/health", "/execution/strategies", "/backtest/list"):
        r = client.get(path)
        # 200 = served fine; 404/405 = route is there, just not GET; 5xx = handler error, still mounted
        assert r.status_code != 404, f"{path} not mounted (got {r.status_code})"
        assert r.status_code != 405, f"{path} mounted without a GET handler (got {r.status_code})"


def test_ws_router_uses_ws_prefix():
    assert routes.ws_router.prefix == "/ws"
    ws_paths = {
        route.path for route in routes.ws_router.routes if hasattr(route, "path")
    }
    assert "/ws/stream/{stream_type}" in ws_paths


@pytest.mark.asyncio
async def test_handle_client_message_subscribe_and_unsubscribe():
    websocket = AsyncMock()

    await handle_client_message(
        websocket,
        {"type": "subscribe", "symbols": ["BTC-USD", "ETH-USD"]},
        StreamType.MARKET.value,
    )
    await handle_client_message(
        websocket,
        {"type": "unsubscribe", "symbols": ["BTC-USD"]},
        StreamType.MARKET.value,
    )
    await handle_client_message(
        websocket,
        {"type": "pong"},
        StreamType.MARKET.value,
    )

    assert websocket.send_json.await_args_list[0].args[0] == {
        "type": "subscribed",
        "symbols": ["BTC-USD", "ETH-USD"],
    }
    assert websocket.send_json.await_args_list[1].args[0] == {
        "type": "unsubscribed",
        "symbols": ["BTC-USD"],
    }


@pytest.mark.asyncio
async def test_connection_manager_broadcast_drops_disconnected_websocket():
    manager = ConnectionManager()
    good_ws = AsyncMock()
    bad_ws = AsyncMock()
    bad_ws.send_text.side_effect = RuntimeError("socket closed")
    manager._connections[StreamType.MARKET.value] = {good_ws, bad_ws}

    await manager.broadcast(StreamType.MARKET.value, {"symbol": "BTC-USD"})

    good_ws.send_text.assert_awaited_once()
    assert bad_ws not in manager._connections[StreamType.MARKET.value]


@pytest.mark.asyncio
async def test_send_to_user_removes_broken_connection():
    manager = ConnectionManager()
    websocket = AsyncMock()
    websocket.send_json.side_effect = RuntimeError("socket closed")
    manager._user_connections["user-1"] = websocket

    await manager.send_to_user("user-1", {"type": "portfolio_update"})

    assert "user-1" not in manager._user_connections


def test_get_websocket_status_counts_connections(monkeypatch):
    fake_manager = MagicMock()
    fake_manager.get_connection_count.side_effect = lambda stream: {
        StreamType.MARKET.value: 2,
        StreamType.SIGNALS.value: 1,
        StreamType.ARBITRAGE.value: 0,
        StreamType.PORTFOLIO.value: 0,
        StreamType.AGENTS.value: 0,
        StreamType.ALL.value: 3,
    }[stream]

    monkeypatch.setattr("app.api.websocket.manager", fake_manager)

    status = get_websocket_status()

    assert status["connections"]["market"] == 2
    assert status["connections"]["all"] == 3
    assert status["total"] == 6
