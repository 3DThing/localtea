"""enforce_unique_user_phone_number

Revision ID: phone_unique_001
Revises: inv_mgmt_001, add_ready_for_pickup
Create Date: 2025-12-21

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "phone_unique_001"
down_revision = ("inv_mgmt_001", "add_ready_for_pickup")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure phone numbers cannot repeat.
    # 1) Drop the old non-unique index (if it exists).
    op.execute("DROP INDEX IF EXISTS public.ix_user_phone_number")

    # 2) Create a unique index for phone_number (if it doesn't exist yet).
    # Postgres UNIQUE index allows multiple NULLs, which is typically desired here.
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS uq_user_phone_number ON public."user" (phone_number)'
    )


def downgrade() -> None:
    # Roll back: remove the unique index and restore the plain (non-unique) index.
    op.execute("DROP INDEX IF EXISTS public.uq_user_phone_number")
    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_user_phone_number ON public."user" (phone_number)'
    )
