"""add ai_telegram_link table

Revision ID: 20260227b
Revises: ai_assistant_001
Create Date: 2026-02-27
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260227b'
down_revision = 'ai_assistant_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ai_telegram_link table (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai_telegram_link (
            id SERIAL PRIMARY KEY,
            admin_user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            telegram_chat_id VARCHAR(64) NOT NULL,
            telegram_username VARCHAR(128),
            notify_new_conversation BOOLEAN DEFAULT TRUE,
            notify_manager_request BOOLEAN DEFAULT TRUE,
            notify_new_message BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_telegram_link_id ON ai_telegram_link(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_telegram_link_admin_user_id ON ai_telegram_link(admin_user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_telegram_link_chat_id ON ai_telegram_link(telegram_chat_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_telegram_link_is_active ON ai_telegram_link(is_active)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai_telegram_link")
