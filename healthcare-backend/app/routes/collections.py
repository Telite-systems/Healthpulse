# ============================================
# Generic Collection Routes Factory
# Creates CRUD endpoints for any collection
# ============================================

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.services.crud import CRUDService
from app.services.auth import get_current_user
import time


def make_api_response(data, status_code=200, message="Success"):
    """Wrap data in the standard API response format the frontend expects."""
    return {
        "data": data,
        "status": status_code,
        "message": message,
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}_{id(data) % 10000}",
    }


def create_collection_router(
    collection_name: str,
    tag: str,
    create_model=None,
    update_model=None,
) -> APIRouter:
    """
    Factory function that creates a full CRUD router for a MongoDB collection.
    Returns an APIRouter with GET(all), GET(id), POST, PUT, DELETE, and SEARCH endpoints.
    """
    router = APIRouter(prefix=f"/api/{collection_name}", tags=[tag])
    service = CRUDService(collection_name)

    @router.get("")
    async def get_all(
        page: int = Query(1, ge=1),
        pageSize: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """Get paginated list of all items."""
        result = await service.get_all(page=page, page_size=pageSize)
        return make_api_response(result)

    @router.get("/search")
    async def search(
        q: str = Query("", description="Search query"),
        current_user: dict = Depends(get_current_user),
    ):
        """Search items by text query."""
        results = await service.search(q)
        return make_api_response(results)

    @router.get("/{item_id}")
    async def get_by_id(
        item_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Get a single item by ID."""
        item = await service.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{collection_name} with id {item_id} not found")
        return make_api_response(item)

    @router.post("")
    async def create_item(
        data: dict,
        current_user: dict = Depends(get_current_user),
    ):
        """Create a new item."""
        result = await service.create(data)
        return make_api_response(result, 201, "Created successfully")

    @router.put("/{item_id}")
    async def update_item(
        item_id: str,
        updates: dict,
        current_user: dict = Depends(get_current_user),
    ):
        """Update an existing item."""
        result = await service.update(item_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail=f"{collection_name} with id {item_id} not found")
        return make_api_response(result)

    @router.delete("/{item_id}")
    async def delete_item(
        item_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Delete an item by ID."""
        success = await service.delete(item_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"{collection_name} with id {item_id} not found")
        return make_api_response({"deleted": True})

    return router
