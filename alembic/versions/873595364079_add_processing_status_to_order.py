"""add_processing_status_to_order

Revision ID: 873595364079
Revises: 2705bdea66c5
Create Date: 2025-12-10 20:19:08.097050

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '873595364079'
down_revision = '105e51eb768b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new value to orderstatus enum
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'processing'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values
    # This would require recreating the enum type
    pass
