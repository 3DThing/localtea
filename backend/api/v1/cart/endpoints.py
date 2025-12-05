from typing import Any, Optional
from fastapi import APIRouter, Depends, Header, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services.cart import cart_service
from backend.schemas import cart as cart_schemas

router = APIRouter()

@router.get("", response_model=cart_schemas.CartResponse)
async def get_cart(
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user_id, session_id = user_session
    
    # If we generated a new session_id, we should probably return it to the client.
    # We can set it in a header or cookie.
    if session_id:
        response.headers["X-Session-ID"] = session_id
        
    return await cart_service.get_cart_with_items(db, user_id, session_id)

@router.post("/items", response_model=cart_schemas.CartResponse)
async def add_item(
    item_in: cart_schemas.CartItemCreate,
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user_id, session_id = user_session
    if session_id:
        response.headers["X-Session-ID"] = session_id
        
    return await cart_service.add_item(db, user_id, session_id, item_in)

@router.patch("/items/{id}", response_model=cart_schemas.CartResponse)
async def update_item(
    id: int,
    item_in: cart_schemas.CartItemUpdate,
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user_id, session_id = user_session
    return await cart_service.update_item(db, user_id, session_id, id, item_in)

@router.delete("/items/{id}", response_model=cart_schemas.CartResponse)
async def remove_item(
    id: int,
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user_id, session_id = user_session
    return await cart_service.remove_item(db, user_id, session_id, id)

@router.delete("", response_model=cart_schemas.CartResponse)
async def clear_cart(
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user_id, session_id = user_session
    return await cart_service.clear_cart(db, user_id, session_id)
