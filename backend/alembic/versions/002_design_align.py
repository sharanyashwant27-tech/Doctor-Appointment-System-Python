"""Align schema to product database design (users/doctors/patients + design columns).

Revision ID: 002_design_align
Revises: 001_initial
Create Date: 2026-07-30

For greenfield installs, prefer create_all / recreate DB.
This revision documents the target Postgres shape when migrating from 001.
"""
from typing import Sequence, Union

revision: str = "002_design_align"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Greenfield / SQLite: drop local DB and recreate via create_all + seed.
    # Postgres production: rename tables/columns to match docs/DATABASE.md
    # (doctor_profiles→doctors, patient_profiles→patients, full_name→name, etc.)
    # Implemented as no-op placeholder when using create_all for local/dev.
    pass


def downgrade() -> None:
    pass
