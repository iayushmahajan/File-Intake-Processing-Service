from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AIReport(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    quality_score: float = Field(ge=0, le=100)
    severity: Literal["low", "medium", "high"]
    executive_summary: str = Field(min_length=1, max_length=2000)
    key_issues: list[str] = Field(max_length=4)
    recommended_actions: list[str] = Field(max_length=4)
    business_impact: str = Field(min_length=1, max_length=2000)


class AIAnalysisResponse(BaseModel):
    report: AIReport | None = None
    error: str | None = None
