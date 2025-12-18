"""
Minimal compatibility layer for the private `emergentintegrations.llm` API.

This shim keeps the application importable in environments where the real
package is unavailable (for example, in public CI or Docker builds). It does
not contact the Emergent service; instead, it returns informative placeholder
responses so API endpoints can fail gracefully.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

_PLACEHOLDER_TEXT = (
    "Emergent integrations client not installed. Install the official "
    "`emergentintegrations` package or provide a compatible client to "
    "enable AI features."
)


@dataclass
class ImageContent:
    """Container for base64-encoded image content."""

    image_base64: str


@dataclass
class UserMessage:
    """Representation of a user message with optional file contents."""

    text: str
    file_contents: List[ImageContent] = field(default_factory=list)


class LlmChat:
    """Lightweight stand-in for the real LlmChat client.

    Methods mirror the expected public surface so application code can keep
    working while signaling that the production dependency is missing.
    """

    def __init__(self, api_key: str, session_id: str, system_message: Optional[str] = None):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.provider: Optional[str] = None
        self.model: Optional[str] = None
        self.params: Dict[str, Any] = {}

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self.provider = provider
        self.model = model
        return self

    def with_params(self, **kwargs: Any) -> "LlmChat":
        self.params.update(kwargs)
        return self

    async def send_message(self, _: UserMessage) -> str:
        """Return a placeholder response explaining the missing dependency."""

        return _PLACEHOLDER_TEXT

    async def send_message_multimodal_response(self, _: UserMessage) -> Tuple[str, List[Any]]:
        """Return placeholder text with no images."""

        return _PLACEHOLDER_TEXT, []
