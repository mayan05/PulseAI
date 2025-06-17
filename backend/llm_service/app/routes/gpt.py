from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/gpt", tags=["gpt"])

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7

@router.post("/generate")
async def generate_text(request: GenerateRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
            
        client = OpenAI(api_key=api_key)
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "user", "content": request.prompt}
            ],
            temperature=request.temperature
        )
        
        return {
            "text": response.choices[0].message.content,
            "model": "gpt-4",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        )