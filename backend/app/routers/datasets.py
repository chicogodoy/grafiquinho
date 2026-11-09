from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models import (
    AddRowPayload,
    CopyPastePayload,
    ManualDatasetPayload,
    QueryFilterPayload,
    UpdateProjectStatePayload,
    UpdateRowPayload,
)
from app.services.ingestion import (
    create_manual_dataset,
    parse_csv_bytes,
    parse_delimited_text,
)
from app.services.query import (
    add_row_to_project,
    delete_row_from_project,
    list_projects,
    query_project_data,
    update_project_state,
    update_row_in_project,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def get_all_projects():
    return {"projects": list_projects()}


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
):
    try:
        content = await file.read()
        proj_name = name.strip() if name and name.strip() else (file.filename or "Upload CSV")
        result = parse_csv_bytes(content, proj_name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar CSV: {str(e)}")


@router.post("/copy-paste")
def ingest_copy_paste(payload: CopyPastePayload):
    try:
        result = parse_delimited_text(
            raw_text=payload.rawText,
            name=payload.name,
            source_type="paste",
            has_header=payload.hasHeader,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar dados colados: {str(e)}")


@router.post("/manual")
def ingest_manual_dataset(payload: ManualDatasetPayload):
    try:
        result = create_manual_dataset(
            name=payload.name,
            x_col=payload.xColumnName,
            y_col=payload.yColumnName,
            label_col=payload.labelColumnName,
            rows=payload.rows,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar base manual: {str(e)}")


@router.post("/{project_id}/query")
def query_project(project_id: str, filters: QueryFilterPayload):
    try:
        return query_project_data(project_id, filters)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na consulta: {str(e)}")


@router.put("/{project_id}/state")
def save_project_state(project_id: str, payload: UpdateProjectStatePayload):
    try:
        cols_list = (
            [c.model_dump() for c in payload.columnsMeta]
            if payload.columnsMeta is not None
            else None
        )
        cfg_dict = payload.chartConfig.model_dump() if payload.chartConfig else None
        hl_dict = (
            {k: v.model_dump() for k, v in payload.highlights.items()}
            if payload.highlights is not None
            else None
        )
        return update_project_state(
            project_id=project_id,
            name=payload.name,
            columns_meta=cols_list,
            chart_config=cfg_dict,
            highlights=hl_dict,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar configurações: {str(e)}")


@router.post("/{project_id}/rows")
def add_row(project_id: str, payload: AddRowPayload):
    try:
        hl_dict = payload.highlight.model_dump() if payload.highlight else None
        return add_row_to_project(project_id, payload.values, hl_dict)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar linha: {str(e)}")


@router.patch("/{project_id}/rows/{row_id}")
def update_row(project_id: str, row_id: int, payload: UpdateRowPayload):
    try:
        return update_row_in_project(
            project_id=project_id,
            row_id=row_id,
            active=payload.active,
            values=payload.values,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar linha: {str(e)}")


@router.delete("/{project_id}/rows/{row_id}")
def delete_row(project_id: str, row_id: int):
    try:
        return delete_row_from_project(project_id, row_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover linha: {str(e)}")

