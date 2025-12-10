"""add_postal_code_to_users

Revision ID: cfd506f10bfb
Revises: 2705bdea66c5
Create Date: 2025-12-09 13:00:57.490227

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cfd506f10bfb'
down_revision = '2705bdea66c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add postal_code column to user table
    op.add_column('user', sa.Column('postal_code', sa.String(), nullable=True))
    op.create_index(op.f('ix_user_postal_code'), 'user', ['postal_code'], unique=False)


def downgrade() -> None:
    # Remove postal_code column from user table
    op.drop_index(op.f('ix_user_postal_code'), table_name='user')
    op.drop_column('user', 'postal_code')
