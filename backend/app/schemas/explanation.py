from pydantic import BaseModel, Field

from app.schemas.analysis import MusicXMLAnalysisResponse


class ExplanationRequest(BaseModel):
    analysis: MusicXMLAnalysisResponse = Field(description="Deterministic analysis JSON to explain.")
    language: str = Field(default="zh-CN", description="Explanation language.")
    level: str = Field(default="student", description="Target explanation level.")


class ExplanationSection(BaseModel):
    title: str = Field(description="Section title.")
    text: str = Field(description="Section text.")


class ExplanationResponse(BaseModel):
    analysis_version: str = Field(description="Version of the deterministic analysis input.")
    explanation_version: str = Field(description="Version of the explanation layer.")
    language: str = Field(description="Explanation language.")
    level: str = Field(description="Target explanation level.")
    summary: str = Field(description="Short explanation summary.")
    sections: list[ExplanationSection] = Field(description="Structured explanation sections.")
    warnings: list[str] = Field(description="Explanation-layer safety and scope warnings.")
