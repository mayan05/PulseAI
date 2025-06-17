from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import gpt, Llama
from pydantic import BaseModel

SYSTEM_MESSAGE = "Make sure you are kind, welcoming, accurate and precise in responding towards the prompts of the user. Make sure you reply ASAP and dont keep the user waiting for your response for too long"

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7

# Initialize FastAPI app
app = FastAPI(title="LLM Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(gpt.router)
app.include_router(Llama.llamaRouter)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True) 