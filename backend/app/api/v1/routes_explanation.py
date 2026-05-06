from fastapi import APIRouter

from app.schemas.explanation import ExplanationRequest, ExplanationResponse
from app.services.explanation_service import TemplateExplanationProvider


router = APIRouter()


@router.post("/explain/analysis", response_model=ExplanationResponse)
async def explain_analysis(request: ExplanationRequest) -> ExplanationResponse:
    provider = TemplateExplanationProvider()
    return provider.explain(
        analysis=request.analysis,
        language=request.language,
        level=request.level,
    )
