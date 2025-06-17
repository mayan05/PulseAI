import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from datetime import datetime
from anthropic import Anthropic
from pydantic import BaseModel

claudeRouter = APIRouter(prefix='/claude', tags=["claude"])

SYSTEM_MESSAGE = "Make sure you are kind, welcoming, accurate and precise in responding towards the prompts of the user. Make sure you reply ASAP and dont keep the user waiting for your response for too long"

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7

load_dotenv()
claude = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

claude_history = []

@claudeRouter.post("/generate")
async def claudeTime(request: GenerateRequest):
    global claude_history
    try:
        claude_history.append({
            "role": "user",
            "content": request.prompt
        })

        response = claude.messages.create(
            model="claude-sonnet-4-20250514",
            system=SYSTEM_MESSAGE,
            messages=claude_history,
            temperature=request.temperature,
            max_tokens=1024
        )

        ass_msg = response.content[0].text
        claude_history.append({
            "role":"assistant",
            "content": ass_msg
        })

        return {
                "text": ass_msg,
                "model": "claude-opus-4-20250514",
                "timestamp": datetime.now().isoformat()
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Interal Server Error: {str(e)}"
        )