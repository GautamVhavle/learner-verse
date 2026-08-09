"""Explicit reservations prevent generation jobs from silently exceeding a cap."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.production_assets import BudgetReservation


class BudgetExceeded(ValueError):
    pass


class BudgetService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def reserve(
        self,
        user_id: uuid.UUID,
        kind: str,
        estimated_cost: float,
        cap: float,
        run_id: uuid.UUID | None = None,
    ) -> BudgetReservation:
        current = await self.session.scalar(
            select(func.coalesce(func.sum(BudgetReservation.reserved_cost), 0)).where(
                BudgetReservation.user_id == user_id, BudgetReservation.status == "reserved"
            )
        )
        if float(current) + estimated_cost > cap:
            raise BudgetExceeded("generation budget cap would be exceeded")
        row = BudgetReservation(
            user_id=user_id,
            run_id=run_id,
            kind=kind,
            reserved_cost=estimated_cost,
            status="reserved",
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def settle(self, reservation: BudgetReservation, actual_cost: float) -> None:
        reservation.actual_cost = actual_cost
        reservation.status = "settled"
        reservation.completed_at = datetime.now(UTC)
        await self.session.flush()
