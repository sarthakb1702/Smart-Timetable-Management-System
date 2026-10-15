from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
import math
from pydantic import BaseModel, Field
from supabase import Client

from app.core.auth import (
    require_roles,
    get_current_user,
    UserContext,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase

router = APIRouter(prefix="/batches", tags=["Batches"])
logger = logging.getLogger(__name__)

MANAGE_ROLES = ("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")


def _division_department_id(supabase: Client, division_id: str) -> Optional[str]:
    res = supabase.table("divisions").select("department_id").eq("id", division_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Division not found")
    return res.data[0].get("department_id")


class BatchBase(BaseModel):
    division_id: str
    name: str = Field(min_length=1, max_length=50)
    student_count: int = Field(default=0, ge=0)


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    student_count: Optional[int] = Field(default=None, ge=0)


class BatchResponse(BatchBase):
    id: str
    created_at: str


class AutoSplitRequest(BaseModel):
    division_id: str
    num_batches: int = Field(ge=1, le=20)
    replace: bool = False


@router.get("", response_model=List[BatchResponse])
async def list_batches(
    division_id: str = Query(...),
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        ensure_department_access(user, _division_department_id(supabase, division_id))
        res = (
            supabase.table("batches")
            .select("*")
            .eq("division_id", division_id)
            .order("name")
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching batches: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch batches")


@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch: BatchCreate,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        ensure_department_access(user, _division_department_id(supabase, batch.division_id))
        res = supabase.table("batches").insert(batch.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create batch")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating batch: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="A batch with that name already exists in this division")
        raise HTTPException(status_code=500, detail="Failed to create batch")


@router.post("/auto-split", response_model=List[BatchResponse], status_code=status.HTTP_201_CREATED)
async def auto_split_batches(
    req: AutoSplitRequest,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        div_res = (
            supabase.table("divisions")
            .select("id, student_count, department_id")
            .eq("id", req.division_id)
            .execute()
        )
        if not div_res.data:
            raise HTTPException(status_code=404, detail="Division not found")
        ensure_department_access(user, div_res.data[0].get("department_id"))

        total_students = div_res.data[0].get("student_count") or 0
        per_batch = math.ceil(total_students / req.num_batches) if total_students else 0

        if req.replace:
            supabase.table("batches").delete().eq("division_id", req.division_id).execute()

        records = [
            {
                "division_id": req.division_id,
                "name": f"A{i + 1}",
                "student_count": per_batch,
            }
            for i in range(req.num_batches)
        ]
        res = supabase.table("batches").insert(records).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create batches")
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-splitting batches: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Batches already exist for this division; use replace=true")
        raise HTTPException(status_code=500, detail="Failed to auto-split batches")


@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: str,
    batch: BatchUpdate,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        existing = supabase.table("batches").select("division_id").eq("id", batch_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Batch not found")
        ensure_department_access(user, _division_department_id(supabase, existing.data[0]["division_id"]))

        update_data = {k: v for k, v in batch.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        res = supabase.table("batches").update(update_data).eq("id", batch_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Batch not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating batch: {e}")
        raise HTTPException(status_code=500, detail="Failed to update batch")


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(
    batch_id: str,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        existing = supabase.table("batches").select("division_id").eq("id", batch_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Batch not found")
        ensure_department_access(user, _division_department_id(supabase, existing.data[0]["division_id"]))
        supabase.table("batches").delete().eq("id", batch_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting batch: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete batch")
