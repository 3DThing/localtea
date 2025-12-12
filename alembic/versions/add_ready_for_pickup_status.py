"""add ready_for_pickup status

Revision ID: add_ready_for_pickup
Revises: 
Create Date: 2025-12-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_ready_for_pickup'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new value to orderstatus enum
    # This was already done manually:
    # ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
    pass


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values
    # Would need to recreate the type
    pass
