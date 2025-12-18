"""
Placeholder image generation client compatible with the backend's expectations.

The production project depends on a private `emergentintegrations` package.
This shim prevents import errors and raises a clear runtime exception to remind
operators to install the official client when image generation features are
required.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class OpenAIImageGeneration:
    def __init__(self, api_key: str, base_url: Optional[str] = None, **kwargs: Any):
        self.api_key = api_key
        self.base_url = base_url
        self.kwargs: Dict[str, Any] = kwargs

    async def generate_image(self, *_: Any, **__: Any) -> List[str]:
        raise RuntimeError(
            "OpenAI image generation requires the private `emergentintegrations` "
            "package. Install the official client to enable this feature."
        )
