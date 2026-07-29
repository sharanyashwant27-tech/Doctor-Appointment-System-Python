"""Unit tests — CSRF helpers."""
from __future__ import annotations

import pytest

from middleware.csrf import _origin_host, allowed_hosts, issue_csrf_token


pytestmark = pytest.mark.unit


def test_origin_host_parsing():
    assert _origin_host("http://localhost:8905") == "localhost:8905"
    assert _origin_host("https://evil.example") == "evil.example"
    assert _origin_host(None) is None


def test_issue_csrf_token_unique():
    a, b = issue_csrf_token(), issue_csrf_token()
    assert a != b
    assert len(a) >= 20


def test_allowed_hosts_includes_cors():
    hosts = allowed_hosts()
    assert "localhost:8905" in hosts or any("localhost" in h for h in hosts)
