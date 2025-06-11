"""
T3 Chat Clone - FastAPI Endpoints
Ready-to-use API endpoints for your backend integration
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uuid
import json

# Import your AI service (assuming it's in a separate file)
# from t3_chat_ai import T3ChatController

app = FastAPI(title="T3 Chat Clone API", version="1.0.0")

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI controller
ai_controller = T3ChatController()

# Pydantic models for request/response validation
class CreateSessionRequest(BaseModel):
    system_prompt: Optional[str] = "You are a helpful AI assistant."
    model: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    max_tokens: int = 2000

class ChatRequest(BaseModel):
    message: str
    session_id: str

class UpdateSettingsRequest(BaseModel):
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

class ChatResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    session_id: Optional[str] = None
    error: Optional[str] = None

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "T3 Chat Clone API is running!", "version": "1.0.0"}

@app.post("/api/chat/session/create")
async def create_session(request: CreateSessionRequest):
    """
    Create a new chat session
    """
    try:
        session_id = str(uuid.uuid4())
        
        response = await ai_controller.create_chat_session({
            "session_id": session_id,
            "system_prompt": request.system_prompt,
            "model": request.model,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        })
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/message")
async def send_message(request: ChatRequest):
    """
    Send a message and get non-streaming response
    """
    try:
        # This uses the non-streaming version
        response = await ai_controller.ai_service.get_chat_response(
            session_id=request.session_id,
            user_message=request.message
        )
        
        return ChatResponse(
            success=True,
            message=response,
            session_id=request.session_id
        )
    
    except Exception as e:
        return ChatResponse(
            success=False,
            error=str(e),
            session_id=request.session_id
        )

@app.post("/api/chat/stream")
async def stream_message(request: ChatRequest):
    """
    Send a message and get streaming response (Server-Sent Events)
    """
    try:
        return StreamingResponse(
            ai_controller.stream_chat_response(request.session_id, request.message),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """
    Get chat history for a session
    """
    try:
        response = await ai_controller.get_chat_history(session_id)
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/chat/session/{session_id}/settings")
async def update_session_settings(session_id: str, request: UpdateSettingsRequest):
    """
    Update session settings (model, temperature, etc.)
    """
    try:
        settings = {}
        if request.system_prompt is not None:
            settings["system_prompt"] = request.system_prompt
        if request.model is not None:
            settings["model"] = request.model
        if request.temperature is not None:
            settings["temperature"] = request.temperature
        if request.max_tokens is not None:
            settings["max_tokens"] = request.max_tokens
        
        response = await ai_controller.update_settings(session_id, settings)
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/session/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a chat session
    """
    try:
        success = ai_controller.ai_service.delete_session(session_id)
        return {"success": success, "session_id": session_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/models")
async def get_available_models():
    """
    Get list of available AI models
    """
    try:
        models = ai_controller.ai_service.get_available_models()
        return {"success": True, "models": models}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/session/{session_id}/info")
async def get_session_info(session_id: str):
    """
    Get session information
    """
    try:
        session = ai_controller.ai_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "session": {
                "session_id": session.session_id,
                "model": session.model,
                "temperature": session.temperature,
                "max_tokens": session.max_tokens,
                "system_prompt": session.system_prompt,
                "message_count": len(session.messages),
                "created_at": session.created_at.isoformat()
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time chat (alternative to Server-Sent Events)
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chat
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_message = message_data.get("message", "")
            
            if not user_message:
                await websocket.send_text(json.dumps({
                    "error": "Empty message"
                }))
                continue
            
            # Send typing indicator
            await websocket.send_text(json.dumps({
                "type": "typing",
                "typing": True
            }))
            
            # Stream AI response
            response_chunks = []
            async for chunk in ai_controller.ai_service.chat_stream(session_id, user_message):
                response_chunks.append(chunk)
                await websocket.send_text(json.dumps({
                    "type": "chunk",
                    "chunk": chunk
                }))
            
            # Send completion signal
            await websocket.send_text(json.dumps({
                "type": "complete",
                "full_response": "".join(response_chunks)
            }))
    
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        await websocket.send_text(json.dumps({
            "error": str(e)
        }))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

# Environment setup instructions:
"""
1. Install dependencies:
   pip install fastapi uvicorn python-multipart httpx

2. Set environment variables:
   export OPENAI_API_KEY="your-openai-api-key"
   export ANTHROPIC_API_KEY="your-anthropic-api-key"  # optional

3. Run the server:
   python main.py
   # or
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

API will be available at:
- http://localhost:8000 (main API)
- http://localhost:8000/docs (Swagger documentation)
- http://localhost:8000/redoc (ReDoc documentation)
"""