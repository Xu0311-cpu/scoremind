from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes_analysis import router as analysis_router
from app.api.v1.routes_explanation import router as explanation_router


app = FastAPI(
    title="AI Music Score Understanding API",
    version="3.0.0",
    description="MVP MusicXML deterministic analysis and template explanation API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router, prefix="/api/v1", tags=["analysis"])
app.include_router(explanation_router, prefix="/api/v1", tags=["explanation"])


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
