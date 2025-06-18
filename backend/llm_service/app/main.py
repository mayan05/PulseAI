from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.gpt import router
from app.routes.Llama import llamaRouter 
from app.routes.claude import claudeRouter
from pydantic import BaseModel
import uvicorn
from fastapi.staticfiles import StaticFiles
import os

SYSTEM_MESSAGE = "Make sure you are kind, welcoming, accurate and precise in responding towards the prompts of the user. If asked about code, return beautiful code formatting"

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7

# Initialize FastAPI app
app = FastAPI(title="LLM Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "https://t3-chat-coral.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router)
app.include_router(llamaRouter)
app.include_router(claudeRouter)

if _name_ == "_main_":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)