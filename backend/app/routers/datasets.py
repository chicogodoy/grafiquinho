from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

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
    delete_project,
    delete_row_from_project,
    list_projects,
    query_project_data,
    update_project_state,
    update_row_in_project,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _clean_client_id(raw: Optional[str]) -> str:
    if not raw or not raw.strip():
        return "public"
    return raw.strip()[:64]


@router.get("")
def get_all_projects(x_client_id: Optional[str] = Header(default="public")):
    cid = _clean_client_id(x_client_id)
    return {"projects": list_projects(client_id=cid)}


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        content = await file.read()
        proj_name = (
            name.strip() if name and name.strip() else (file.filename or "Upload CSV")
        )
        result = parse_csv_bytes(content, proj_name, client_id=cid)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao processar CSV: {str(e)}"
        )


@router.post("/copy-paste")
def ingest_copy_paste(
    payload: CopyPastePayload,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        result = parse_delimited_text(
            raw_text=payload.rawText,
            name=payload.name,
            source_type="paste",
            has_header=payload.hasHeader,
            client_id=cid,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao processar dados colados: {str(e)}"
        )


@router.post("/manual")
def ingest_manual_dataset(
    payload: ManualDatasetPayload,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        result = create_manual_dataset(
            name=payload.name,
            x_col=payload.xColumnName,
            y_col=payload.yColumnName,
            label_col=payload.labelColumnName,
            rows=payload.rows,
            client_id=cid,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar base manual: {str(e)}"
        )


@router.post("/{project_id}/query")
def query_project(
    project_id: str,
    filters: QueryFilterPayload,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        return query_project_data(project_id, filters, client_id=cid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na consulta: {str(e)}")


@router.put("/{project_id}/state")
def save_project_state(
    project_id: str,
    payload: UpdateProjectStatePayload,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
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
            client_id=cid,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao salvar configurações: {str(e)}"
        )


@router.delete("/{project_id}")
def remove_project(
    project_id: str,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        return delete_project(project_id, client_id=cid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao remover base: {str(e)}"
        )


@router.post("/{project_id}/rows")
def add_row(
    project_id: str,
    payload: AddRowPayload,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        hl_dict = payload.highlight.model_dump() if payload.highlight else None
        return add_row_to_project(
            project_id, payload.values, hl_dict, client_id=cid
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao adicionar linha: {str(e)}"
        )


@router.patch("/{project_id}/rows/{row_id}")
def update_row(
    project_id: str,
    row_id: int,
    payload: UpdateRowPayload,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        return update_row_in_project(
            project_id=project_id,
            row_id=row_id,
            active=payload.active,
            values=payload.values,
            client_id=cid,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar linha: {str(e)}"
        )


@router.delete("/{project_id}/rows/{row_id}")
def delete_row(
    project_id: str,
    row_id: int,
    x_client_id: Optional[str] = Header(default="public"),
):
    try:
        cid = _clean_client_id(x_client_id)
        return delete_row_from_project(project_id, row_id, client_id=cid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao remover linha: {str(e)}"
        )
