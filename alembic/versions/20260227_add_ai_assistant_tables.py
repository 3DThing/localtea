"""add AI assistant tables

Revision ID: ai_assistant_001
Revises: phone_unique_001
Create Date: 2026-02-27 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision = "ai_assistant_001"
down_revision = "phone_unique_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # AI Assistant Settings
    op.create_table(
        "ai_assistant_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("value_type", sa.String(20), server_default="string"),
        sa.Column("group", sa.String(50), server_default="general"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Conversation status enum
    ai_conversation_status = sa.Enum(
        "active", "manager_requested", "manager_connected", "closed",
        name="ai_conversation_status",
    )

    # AI Conversations
    op.create_table(
        "ai_conversation",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("session_id", sa.String(128), nullable=True, index=True),
        sa.Column("status", ai_conversation_status, nullable=False, server_default="active"),
        sa.Column("manager_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message_count", sa.Integer(), server_default="0"),
        sa.Column("total_tokens_used", sa.Integer(), server_default="0"),
    )
    op.create_index("ix_ai_conversation_created", "ai_conversation", ["created_at"])
    op.create_index("ix_ai_conversation_status_updated", "ai_conversation", ["status", "updated_at"])

    # Message role enum
    ai_message_role = sa.Enum(
        "user", "assistant", "manager", "system",
        name="ai_message_role",
    )

    # AI Messages
    op.create_table(
        "ai_message",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("ai_conversation.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", ai_message_role, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("was_filtered", sa.Boolean(), server_default="false"),
        sa.Column("original_content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_message_conv_created", "ai_message", ["conversation_id", "created_at"])

    # RAG Documents
    op.create_table(
        "ai_rag_document",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(100), nullable=True, index=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", index=True),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
    )

    # Banned Phrases
    op.create_table(
        "ai_banned_phrase",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("phrase", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("apply_to_input", sa.Boolean(), server_default="true"),
        sa.Column("apply_to_output", sa.Boolean(), server_default="true"),
        sa.Column("action", sa.String(20), server_default="block"),
        sa.Column("replacement", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("ai_banned_phrase")
    op.drop_table("ai_rag_document")
    op.drop_table("ai_message")
    op.drop_table("ai_conversation")
    op.drop_table("ai_assistant_settings")

    # Drop enums
    sa.Enum(name="ai_message_role").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="ai_conversation_status").drop(op.get_bind(), checkfirst=True)
