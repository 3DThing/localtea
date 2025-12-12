"""add store_settings table

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2024-01-15 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'store_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('value_type', sa.String(length=20), server_default='string'),
        sa.Column('group', sa.String(length=50), server_default='general'),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('is_public', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_store_settings_id'), 'store_settings', ['id'], unique=False)
    op.create_index(op.f('ix_store_settings_key'), 'store_settings', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_store_settings_key'), table_name='store_settings')
    op.drop_index(op.f('ix_store_settings_id'), table_name='store_settings')
    op.drop_table('store_settings')
