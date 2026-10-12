from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def write_audit(
    session: AsyncSession,
    *,
    actor_user_id: int | None,
    action: str,
    target: str = "",
    detail: str = "",
) -> None:
    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target=target[:128],
            detail=detail[:4000],
        )
    )
    await session.flush()
