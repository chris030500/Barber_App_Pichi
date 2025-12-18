"""
Lightweight fallback shim for the `emergentintegrations` package used by the backend.

The real library is private and not published to PyPI, so Docker builds can fail
without it. This shim keeps the server importable and provides helpful runtime
messages until you install the official wheel or replace it with your own client.
"""

__all__ = ["llm"]
