import json
import uuid
from pathlib import Path
from typing import Literal, Union

import aiofiles
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Pydantic models (mirror frontend TypeScript types)
# ---------------------------------------------------------------------------

class KeyframeModel(BaseModel):
    time: float
    value: Union[float, bool, str]
    interpolation: Literal["linear", "step"]

class ChannelConfigModel(BaseModel):
    min: float | None = None
    max: float | None = None

class ChannelModel(BaseModel):
    id: str
    name: str
    type: Literal["bool", "float", "int", "color"]
    config: ChannelConfigModel
    keyframes: list[KeyframeModel]

class ProjectMetaModel(BaseModel):
    name: str
    duration: float
    timeMode: Literal["seconds", "frames", "bpm"]
    fps: int

class TimelineProjectModel(BaseModel):
    project: ProjectMetaModel
    channels: list[ChannelModel]

class SavedProject(TimelineProjectModel):
    id: str

class ProjectSummary(BaseModel):
    id: str
    name: str

# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

PROJECTS_DIR = Path(__file__).parent / "projects"

app = FastAPI()

@app.on_event("startup")
async def startup():
    PROJECTS_DIR.mkdir(exist_ok=True)

def _project_path(project_id: str) -> Path:
    # Prevent path traversal
    if "/" in project_id or "\\" in project_id or ".." in project_id:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    return PROJECTS_DIR / f"{project_id}.json"

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/projects", response_model=list[ProjectSummary])
async def list_projects():
    summaries: list[ProjectSummary] = []
    for path in sorted(PROJECTS_DIR.glob("*.json")):
        try:
            async with aiofiles.open(path, "r") as f:
                data = json.loads(await f.read())
            summaries.append(ProjectSummary(id=data["id"], name=data["project"]["name"]))
        except (json.JSONDecodeError, KeyError):
            continue
    return summaries


@app.post("/api/projects", response_model=SavedProject, status_code=201)
async def create_project(body: TimelineProjectModel):
    project_id = str(uuid.uuid4())
    saved = SavedProject(id=project_id, **body.model_dump())
    path = _project_path(project_id)
    async with aiofiles.open(path, "w") as f:
        await f.write(saved.model_dump_json(indent=2))
    return saved


@app.get("/api/projects/{project_id}", response_model=SavedProject)
async def get_project(project_id: str):
    path = _project_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    async with aiofiles.open(path, "r") as f:
        data = json.loads(await f.read())
    return SavedProject(**data)


@app.put("/api/projects/{project_id}", response_model=SavedProject)
async def update_project(project_id: str, body: TimelineProjectModel):
    path = _project_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    saved = SavedProject(id=project_id, **body.model_dump())
    async with aiofiles.open(path, "w") as f:
        await f.write(saved.model_dump_json(indent=2))
    return saved


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    path = _project_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    path.unlink()
    return JSONResponse(status_code=200, content={"detail": "Deleted"})
