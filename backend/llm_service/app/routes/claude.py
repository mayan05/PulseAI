import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from datetime import datetime
from main import SYSTEM_MESSAGE, GenerateRequest
from anthropic import Anthropic

claudeRouter = APIRouter(prefix='/claude', tags=["claude"])

load_dotenv()
claude = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

claude_history = [{
    "role": "system",
    "content": SYSTEM_MESSAGE
}]

@claudeRouter.post("/generate")
async def claudeTime(request: GenerateRequest):
    global claude_history
    try:
        claude_history.append({
            "role": "user",
            "content": request.prompt
        })

        response = claude.messages.create(
            model="claude-opus-4-20250514",
            system=SYSTEM_MESSAGE,
            messages=claude_history,
            temperature=request.temperature
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