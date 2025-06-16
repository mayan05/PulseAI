import os
from groq import Groq
from pydantic import BaseModel 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
import uvicorn

class Request(BaseModel):
    prompt : str

SYSTEM_MESSAGE = "Make sure you are kind, welcoming, accurate and precise in responding towards the prompts of the user. Make sure you reply ASAP and dont keep the user waiting for your response for too long"

app = FastAPI(title="T3 Chat Clone")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llama = Groq(api_key=os.getenv("GROQ_API_KEY"))

llama_history = [
    {
        "role": "system",
        "content": SYSTEM_MESSAGE
    }
]

gpt_history = [
    {
        "role": "system",
        "content": SYSTEM_MESSAGE
    }
]

claude_history = [
    {
        "role": "system",
        "content": SYSTEM_MESSAGE
    }
]

@app.post("/generate/llama")
def llamaTime(data : Request):
    global llama_history
    
    # Add user message to history
    llama_history.append({
        "role": "user",
        "content": data.prompt
    })
    
    # Get response from API
    response = llama.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=llama_history,
        temperature=0.7
    )
    
    # Extract assistant's response
    assitant_msg = response.choices[0].message.content
    
    # Add assistant's response to history
    llama_history.append({
        "role": "assistant",
        "content": assitant_msg
    })
    
    return {"reply" : assitant_msg}

if __name__ == "__main__":
    uvicorn.run("endpoints:app", host="localhost", port=8000)
   