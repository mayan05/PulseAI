from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from openai import OpenAI

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
