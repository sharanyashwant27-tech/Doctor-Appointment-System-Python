"""Shared schemas and permissive email type (allows .local demo domains)."""
from typing import Annotated, Generic, List, Optional, TypeVar

from pydantic import AfterValidator, BaseModel, ConfigDict


def _validate_email(value: str) -> str:
    v = (value or "").strip().lower()
    if "@" not in v:
        raise ValueError("Invalid email address")
    local, _, domain = v.partition("@")
    if not local or not domain or "." not in domain:
        raise ValueError("Invalid email address")
    return v


# Demo accounts use @medibook.local — EmailStr rejects .local as special-use.
EmailStr = Annotated[str, AfterValidator(_validate_email)]

T = TypeVar("T")


class Message(BaseModel):
    message: str


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Paginated(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int = 1
    size: int = 20
