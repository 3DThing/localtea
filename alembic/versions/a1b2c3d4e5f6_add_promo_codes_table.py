"""add promo_codes table

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2024-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '873595364079'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'promo_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('discount_type', sa.Enum('percentage', 'fixed', name='discounttype'), nullable=True),
        sa.Column('discount_value', sa.Integer(), nullable=False),
        sa.Column('min_order_amount_cents', sa.Integer(), server_default='0'),
        sa.Column('max_discount_cents', sa.Integer(), nullable=True),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), server_default='0'),
        sa.Column('usage_limit_per_user', sa.Integer(), server_default='1'),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_promo_codes_id'), 'promo_codes', ['id'], unique=False)
    op.create_index(op.f('ix_promo_codes_code'), 'promo_codes', ['code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_promo_codes_code'), table_name='promo_codes')
    op.drop_index(op.f('ix_promo_codes_id'), table_name='promo_codes')
    op.drop_table('promo_codes')
    op.execute("DROP TYPE IF EXISTS discounttype")
