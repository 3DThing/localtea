"""add_phone_number_to_users

Revision ID: 105e51eb768b
Revises: cfd506f10bfb
Create Date: 2025-12-09 13:21:15.262753

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '105e51eb768b'
down_revision = 'cfd506f10bfb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add phone_number column to user table
    op.add_column('user', sa.Column('phone_number', sa.String(), nullable=True))
    op.create_index(op.f('ix_user_phone_number'), 'user', ['phone_number'], unique=False)


def downgrade() -> None:
    # Remove phone_number column from user table
    op.drop_index(op.f('ix_user_phone_number'), table_name='user')
    op.drop_column('user', 'phone_number')
