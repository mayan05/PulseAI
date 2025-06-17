import os
from groq import Groq
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from datetime import datetime
from main import SYSTEM_MESSAGE, GenerateRequest

llamaRouter = APIRouter(prefix="/llama", tags=["llama"])

load_dotenv()
llama = Groq(api_key=os.getenv("GROQ_API_KEY"))

llama_history = [
    {
        "role": "system",
        "content": SYSTEM_MESSAGE
    }
]

@llamaRouter.post("/generate")
async def llamaTime(data : GenerateRequest):
    global llama_history
    try:
        # Add user message to history
        llama_history.append({
            "role": "user",
            "content": data.prompt
        })
    
        # Get response from API
        response = llama.chat.completions.create(
         model="llama-3.3-70b-versatile",
            messages=llama_history,
            temperature=data.temperature
        )
    
        # Extract assistant's response
        assitant_msg = response.choices[0].message.content
    
        # Add assistant's response to history
        llama_history.append({
            "role": "assistant",
            "content": assitant_msg
        })
    
        return {
                "text": assitant_msg,
                "model": "llama-3.3-70b-versatile",
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        ) 
   