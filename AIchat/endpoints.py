from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
from typing import Dict
from datetime import datetime
import os
from groq import Groq
from manager import ChatManager
from core import ( 
    ChatRequest, 
    ChatResponse, 
    SessionInfo,
    Models,
    Role,
    SYSTEM_MESSAGE
)

chat_manager = ChatManager()

app = FastAPI(title="T3 chat app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# API Endpoints
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint"""
    try:
        session = chat_manager.get_or_create_session(
            session_id=request.session_id,
            user_id=request.user_id
        )
        
        user_message = session.add_message(Role.USER, request.message)
        
        # Get messages for API
        messages = session.get_messages_for_api()
        
        # Call Groq API
        response = client.chat.completions.create(
            model=session.model,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Extract response
        ai_response = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else None
        
        # Add AI response to session
        ai_message = session.add_message(Role.ASS, ai_response, tokens_used)
        
        return ChatResponse(
            response=ai_response,
            session_id=session.session_id,
            message_id=ai_message.id,
            tokens_used=tokens_used,
            total_session_tokens=session.get_total_tokens()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/api/session/{session_id}", response_model=SessionInfo)
async def get_session_info(session_id: str):
    session = chat_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionInfo(
        session_id=session.session_id,
        message_count=len(session.messages),
        created_at=session.created_at,
        last_activity=session.last_activity,
        total_tokens=session.get_total_tokens()
    )

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    if chat_manager.delete_session(session_id):
        return {"message": "Session deleted successfully"}
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/api/stats")
async def get_stats():
    return {
        "active_sessions": chat_manager.get_session_count(),
        "timestamp": datetime.now()
    }

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)