from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from contextlib import asynccontextmanager

import sys
from pathlib import Path as SysPath

sys.path.append(str(SysPath(__file__).parent.parent))

from app.database import init_db, get_db
from app.models import UserClick, UserGroup


@asynccontextmanager
async def lifespan(app: FastAPI):
    # init_db()
    yield


app = FastAPI(title="Button Counter", lifespan=lifespan)

static_dir = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


class ClickRequest(BaseModel):
    group_name: str


class ClickResponse(BaseModel):
    user_id: str
    click_count: int
    updated_at: Optional[str] = None
    group_name: Optional[str] = None
    group_total_click_count: Optional[int] = None


class GroupClickResponse(BaseModel):
    group_name: str
    total_click_count: int


@app.get("/")
async def read_root():
    return FileResponse(str(static_dir / "index.html"))


@app.post("/api/click/{user_id}", response_model=ClickResponse)
async def increment_click(user_id: str, request: ClickRequest, db: Session = Depends(get_db)):
    user_click = db.query(UserClick).filter(UserClick.user_id == user_id).first()
    user_group = db.query(UserGroup).filter(UserGroup.group_name == request.group_name).first()

    if not user_group:
        user_group = UserGroup(group_name=request.group_name, total_click_count=1)
        db.add(user_group)
    else:
        setattr(user_group, 'total_click_count', user_group.total_click_count + 1)

    if not user_click:
        user_click = UserClick(user_id=user_id, click_count=1, group=user_group)
        db.add(user_click)
    else:
        setattr(user_click, 'click_count', user_click.click_count + 1)
        user_click.group = user_group

    db.commit()
    db.refresh(user_click)
    db.refresh(user_group)

    response = user_click.to_dict()
    response["group_total_click_count"] = user_group.total_click_count
    return response


@app.get("/api/clicks/{user_id}", response_model=ClickResponse)
async def get_clicks(user_id: str, db: Session = Depends(get_db)):
    user_click = db.query(UserClick).filter(UserClick.user_id == user_id).first()
    
    if not user_click:
        raise HTTPException(status_code=404, detail="User not found")

    response = user_click.to_dict()
    if user_click.group:
        response["group_total_click_count"] = user_click.group.total_click_count
    else:
        response["group_total_click_count"] = 0
    
    return response


@app.get("/api/clicks/group/{group_name}", response_model=GroupClickResponse)
async def get_group_clicks(group_name: str, db: Session = Depends(get_db)):
    user_group = db.query(UserGroup).filter(UserGroup.group_name == group_name).first()

    if not user_group:
        raise HTTPException(status_code=404, detail="Group not found")

    return {
        "group_name": user_group.group_name,
        "total_click_count": user_group.total_click_count,
    }
