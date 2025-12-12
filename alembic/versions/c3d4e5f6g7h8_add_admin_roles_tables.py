"""add admin_roles and admin_user_roles tables

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2024-01-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Admin roles table
    op.create_table(
        'admin_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('is_builtin', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_roles_id'), 'admin_roles', ['id'], unique=False)
    op.create_index(op.f('ix_admin_roles_name'), 'admin_roles', ['name'], unique=True)
    
    # Association table for users <-> roles
    op.create_table(
        'admin_user_roles',
        sa.Column('admin_user_id', sa.Integer(), nullable=False),
        sa.Column('admin_role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['admin_user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_role_id'], ['admin_roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('admin_user_id', 'admin_role_id')
    )


def downgrade() -> None:
    op.drop_table('admin_user_roles')
    op.drop_index(op.f('ix_admin_roles_name'), table_name='admin_roles')
    op.drop_index(op.f('ix_admin_roles_id'), table_name='admin_roles')
    op.drop_table('admin_roles')
