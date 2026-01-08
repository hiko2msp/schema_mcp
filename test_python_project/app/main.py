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
from app.models import UserClick


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Button Counter", lifespan=lifespan)

static_dir = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


class ClickResponse(BaseModel):
    user_id: str
    click_count: int
    updated_at: Optional[str] = None


@app.get("/")
async def read_root():
    return FileResponse(str(static_dir / "index.html"))


@app.post("/api/click/{user_id}", response_model=ClickResponse)
async def increment_click(user_id: str, db: Session = Depends(get_db)):
    user_click = db.query(UserClick).filter(UserClick.user_id == user_id).first()
    
    if not user_click:
        user_click = UserClick(user_id=user_id, click_count=1)
        db.add(user_click)
    else:
        setattr(user_click, 'click_count', user_click.click_count + 1)
    
    db.commit()
    db.refresh(user_click)
    
    return user_click.to_dict()


@app.get("/api/clicks/{user_id}", response_model=ClickResponse)
async def get_clicks(user_id: str, db: Session = Depends(get_db)):
    user_click = db.query(UserClick).filter(UserClick.user_id == user_id).first()
    
    if not user_click:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_click.to_dict()
