"""Audit-only network guard; does not alter repository source."""

import sys


def audit_guard(event, args):
    if event == "socket.connect":
        address = args[1]
        # Windows asyncio uses a loopback socket pair internally. Permit that
        # local mechanism, while rejecting the deliberately disabled port 9.
        if (
            isinstance(address, tuple)
            and address[0] in ("127.0.0.1", "::1", "localhost")
            and address[1] != 9
        ):
            return
        raise OSError("enterprise-crypto audit: outbound network disabled")


sys.addaudithook(audit_guard)
