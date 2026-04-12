from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standardized typed API response envelope."""

    success: bool = Field(default=True)
    message: str
    data: T
