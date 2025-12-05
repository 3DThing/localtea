from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.admin_log import AdminActionLog
from typing import Optional, Dict, Any

async def log_admin_action(
    db: AsyncSession,
    admin_id: int,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    details: Optional[str] = None
):
    details_dict = {
        "entity_type": entity_type,
        "message": details
    }
    
    log_entry = AdminActionLog(
        admin_id=admin_id,
        action=action,
        entity_id=entity_id,
        details=details_dict
    )
    db.add(log_entry)
