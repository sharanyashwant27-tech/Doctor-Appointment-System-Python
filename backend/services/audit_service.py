"""Audit log writer."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.audit_log import AuditLog


def write_audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    actor_user_id: Optional[int] = None,
    entity_id: Optional[str] = None,
    ip: Optional[str] = None,
    details: Optional[Any] = None,
) -> AuditLog:
    row = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip=ip,
        details=details,
    )
    db.add(row)
    return row


def list_audit_logs(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    entity_type: Optional[str] = None,
) -> list[AuditLog]:
    q = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    return list(db.scalars(q.offset(skip).limit(limit)).all())
