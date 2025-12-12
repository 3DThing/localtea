"""add inventory management

Revision ID: inv_mgmt_001
Revises: 
Create Date: 2025-01-13

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'inv_mgmt_001'
down_revision: Union[str, None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create movement_type enum
    movement_type_enum = sa.Enum(
        'incoming', 'outgoing', 'adjustment', 'return', 'write_off', 'transfer',
        name='movementtype'
    )
    movement_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Create inventory_categories table
    op.create_table(
        'inventory_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_inventory_categories_name', 'inventory_categories', ['name'])
    
    # Create inventory_materials table
    op.create_table(
        'inventory_materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sku_code', sa.String(100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('unit', sa.String(50), nullable=False, server_default='шт'),
        sa.Column('quantity', sa.Numeric(15, 4), nullable=False, server_default='0'),
        sa.Column('min_quantity', sa.Numeric(15, 4), nullable=False, server_default='0'),
        sa.Column('cost_per_unit_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['category_id'], ['inventory_categories.id'], ondelete='RESTRICT')
    )
    op.create_index('ix_inventory_materials_category_id', 'inventory_materials', ['category_id'])
    op.create_index('ix_inventory_materials_sku_code', 'inventory_materials', ['sku_code'], unique=True)
    op.create_index('ix_inventory_materials_name', 'inventory_materials', ['name'])
    
    # Create product_stock table
    op.create_table(
        'product_stock',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sku_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reserved', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('min_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['sku_id'], ['sku.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('sku_id')
    )
    op.create_index('ix_product_stock_sku_id', 'product_stock', ['sku_id'])
    
    # Create inventory_movements table
    op.create_table(
        'inventory_movements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=True),
        sa.Column('sku_id', sa.Integer(), nullable=True),
        sa.Column('movement_type', movement_type_enum, nullable=False),
        sa.Column('quantity', sa.Numeric(15, 4), nullable=False),
        sa.Column('quantity_before', sa.Numeric(15, 4), nullable=False),
        sa.Column('quantity_after', sa.Numeric(15, 4), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['material_id'], ['inventory_materials.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sku_id'], ['sku.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['order.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['admin_id'], ['user.id'], ondelete='SET NULL')
    )
    op.create_index('ix_inventory_movements_material_id', 'inventory_movements', ['material_id'])
    op.create_index('ix_inventory_movements_sku_id', 'inventory_movements', ['sku_id'])
    op.create_index('ix_inventory_movements_movement_type', 'inventory_movements', ['movement_type'])
    op.create_index('ix_inventory_movements_created_at', 'inventory_movements', ['created_at'])
    op.create_index('ix_inventory_movements_admin_id', 'inventory_movements', ['admin_id'])


def downgrade() -> None:
    op.drop_index('ix_inventory_movements_admin_id', 'inventory_movements')
    op.drop_index('ix_inventory_movements_created_at', 'inventory_movements')
    op.drop_index('ix_inventory_movements_movement_type', 'inventory_movements')
    op.drop_index('ix_inventory_movements_sku_id', 'inventory_movements')
    op.drop_index('ix_inventory_movements_material_id', 'inventory_movements')
    op.drop_table('inventory_movements')
    
    op.drop_index('ix_product_stock_sku_id', 'product_stock')
    op.drop_table('product_stock')
    
    op.drop_index('ix_inventory_materials_name', 'inventory_materials')
    op.drop_index('ix_inventory_materials_sku_code', 'inventory_materials')
    op.drop_index('ix_inventory_materials_category_id', 'inventory_materials')
    op.drop_table('inventory_materials')
    
    op.drop_index('ix_inventory_categories_name', 'inventory_categories')
    op.drop_table('inventory_categories')
    
    # Drop enum
    sa.Enum(name='movementtype').drop(op.get_bind(), checkfirst=True)
