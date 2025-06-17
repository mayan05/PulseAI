from fastapi import APIRouter, HTTPException
from openai import OpenAI
import os
from dotenv import load_dotenv
from datetime import datetime
from main import SYSTEM_MESSAGE, GenerateRequest

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/gpt", tags=["gpt"])

gpt_history = [{
    "role": "system",
    "content": SYSTEM_MESSAGE
}]

@router.post("/generate")
async def gptTime(request: GenerateRequest):
    global gpt_history
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
            
        client = OpenAI(api_key=api_key)

        gpt_history.append({
            "role": "user",
            "content" : request.prompt
        })
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=gpt_history,
            temperature=request.temperature
        )

        assistant_msg = response.choices[0].message['content']

        gpt_history.append({
            "role": "assistant",
            "content" : assistant_msg
        })
        
        return {
            "text": assistant_msg,
            "model": "gpt-4.1",
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Interal Server Error: {str(e)}"
        ) 