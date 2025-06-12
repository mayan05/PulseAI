import asyncio
import json
import os
from typing import Dict, List, Optional, AsyncGenerator, Any
from dataclasses import dataclass, asdict
from enum import Enum
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

class AIProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

@dataclass
class ChatMessage:
    role: str  # "user", "system"
    content: str
    timestamp: datetime = None
    model: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class ChatSession:
    session_id: str
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    model: str = "gpt-3.5-turbo"
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class T3ChatAI:
    """Main AI service for T3 Chat clone"""
    ALLOWED_MODELS = ["gpt-4", "claude-3-sonnet"]
    
    def __init__(self):
        self.providers = {
            AIProvider.OPENAI: {
                "api_key": os.environ.get("OPENAI_API_KEY"),
                "base_url": "https://api.openai.com/v1",
                "models": ["gpt-4"]
            },
            AIProvider.ANTHROPIC: {
                "api_key": os.environ.get("ANTHROPIC_API_KEY"),
                "base_url": "https://api.anthropic.com/v1",
                "models": ["claude-3-sonnet"]
            }
        }
        self.sessions: Dict[str, ChatSession] = {}
        self.client = httpx.AsyncClient(timeout=30.0)
    
    def create_session(self, 
                      session_id: str, 
                      system_prompt: str = None,
                      model: str = "gpt-4",
                      temperature: float = 0.7) -> ChatSession:
        """Create a new chat session"""
        if model not in self.ALLOWED_MODELS:
            raise ValueError(f"Model '{model}' is not allowed. Allowed models: {self.ALLOWED_MODELS}")
        session = ChatSession(
            session_id=session_id,
            messages=[],
            system_prompt=system_prompt,
            temperature=temperature,
            model=model
        )
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get existing chat session"""
        return self.sessions.get(session_id)
    
    async def chat_stream(self, 
                         session_id: str, 
                         user_message: str) -> AsyncGenerator[str, None]:
        """
        Stream chat responses for real-time typing effect
        """
        session = self.get_session(session_id)
        if not session:
            yield "Error: Session not found"
            return
        
        # Add user message to session
        session.messages.append(ChatMessage(role="user", content=user_message))
        
        try:
            # Determine provider based on model
            provider = self._get_provider_for_model(session.model)
            
            if provider == AIProvider.OPENAI:
                async for chunk in self._stream_openai(session):
                    yield chunk
            elif provider == AIProvider.ANTHROPIC:
                async for chunk in self._stream_anthropic(session):
                    yield chunk
            else:
                yield "Error: Unsupported model"
                
        except Exception as e:
            yield f"Error: {str(e)}"
    
    async def _stream_openai(self, session: ChatSession) -> AsyncGenerator[str, None]:
        """Stream OpenAI responses"""
        headers = {
            "Authorization": f"Bearer {self.providers[AIProvider.OPENAI]['api_key']}",
            "Content-Type": "application/json"
        }
        
        messages = self._prepare_messages(session)
        
        payload = {
            "model": session.model,
            "messages": messages,
            "temperature": session.temperature,
            "max_tokens": session.max_tokens,
            "stream": True
        }
        
        full_response = ""
        
        async with self.client.stream(
            "POST",
            f"{self.providers[AIProvider.OPENAI]['base_url']}/chat/completions",
            headers=headers,
            json=payload
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # Remove "data: " prefix
                    if data.strip() == "[DONE]":
                        break
                    try:
                        json_data = json.loads(data)
                        if "choices" in json_data and len(json_data["choices"]) > 0:
                            delta = json_data["choices"][0].get("delta", {})
                            if "content" in delta:
                                chunk = delta["content"]
                                full_response += chunk
                                yield chunk
                    except json.JSONDecodeError:
                        continue
        
        # Add assistant response to session
        session.messages.append(ChatMessage(
            role="assistant", 
            content=full_response,
            model=session.model
        ))
    
    async def _stream_anthropic(self, session: ChatSession) -> AsyncGenerator[str, None]:
        """Stream Anthropic Claude responses"""
        headers = {
            "x-api-key": self.providers[AIProvider.ANTHROPIC]['api_key'],
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        messages = self._prepare_messages_anthropic(session)
        
        payload = {
            "model": session.model,
            "messages": messages,
            "max_tokens": session.max_tokens,
            "temperature": session.temperature,
            "stream": True
        }
        
        if session.system_prompt:
            payload["system"] = session.system_prompt
        
        full_response = ""
        
        async with self.client.stream(
            "POST",
            f"{self.providers[AIProvider.ANTHROPIC]['base_url']}/messages",
            headers=headers,
            json=payload
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    try:
                        json_data = json.loads(data)
                        if json_data.get("type") == "content_block_delta":
                            chunk = json_data.get("delta", {}).get("text", "")
                            full_response += chunk
                            yield chunk
                    except json.JSONDecodeError:
                        continue
        
        # Add assistant response to session
        session.messages.append(ChatMessage(
            role="assistant", 
            content=full_response,
            model=session.model
        ))
    
    def _prepare_messages(self, session: ChatSession) -> List[Dict[str, str]]:
        """Prepare messages for OpenAI format"""
        messages = []
        
        if session.system_prompt:
            messages.append({"role": "system", "content": session.system_prompt})
        
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        return messages
    
    def _prepare_messages_anthropic(self, session: ChatSession) -> List[Dict[str, str]]:
        """Prepare messages for Anthropic format (excludes system message)"""
        messages = []
        
        for msg in session.messages:
            if msg.role != "system":  # Anthropic handles system separately
                messages.append({"role": msg.role, "content": msg.content})
        
        return messages
    
    def _get_provider_for_model(self, model: str) -> AIProvider:
        """Determine which provider to use based on model name"""
        if model.startswith("gpt"):
            return AIProvider.OPENAI
        elif model.startswith("claude"):
            return AIProvider.ANTHROPIC
        else:
            return AIProvider.OPENAI  # Default
    
    async def get_chat_response(self, 
                               session_id: str, 
                               user_message: str) -> str:
        """Get non-streaming chat response"""
        session = self.get_session(session_id)
        if not session:
            return "Error: Session not found"
        
        full_response = ""
        async for chunk in self.chat_stream(session_id, user_message):
            full_response += chunk
        
        return full_response
    
    def get_session_history(self, session_id: str) -> List[Dict]:
        """Get chat history for a session"""
        session = self.get_session(session_id)
        if not session:
            return []
        
        return [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "model": msg.model
            }
            for msg in session.messages
        ]
    
    def update_session_settings(self, 
                               session_id: str,
                               system_prompt: str = None,
                               temperature: float = None,
                               model: str = None,
                               max_tokens: int = None) -> bool:
        """Update session settings"""
        session = self.get_session(session_id)
        if not session:
            return False
        if model is not None:
            if model not in self.ALLOWED_MODELS:
                return False
            session.model = model
        if system_prompt is not None:
            session.system_prompt = system_prompt
        if temperature is not None:
            session.temperature = temperature
        if max_tokens is not None:
            session.max_tokens = max_tokens
        return True
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def get_available_models(self) -> Dict[str, List[str]]:
        """Get list of available models by provider"""
        return {
            AIProvider.OPENAI.value: ["gpt-4"],
            AIProvider.ANTHROPIC.value: ["claude-3-sonnet"]
        }

# FastAPI/Flask integration example
class T3ChatController:
    """Web controller for T3 Chat AI service"""
    
    def __init__(self):
        self.ai_service = T3ChatAI()
    
    async def create_chat_session(self, request_data: Dict) -> Dict:
        """Create new chat session endpoint"""
        session_id = request_data.get("session_id")
        system_prompt = request_data.get("system_prompt")
        model = request_data.get("model", "gpt-4")
        temperature = request_data.get("temperature", 0.7)
        if model not in T3ChatAI.ALLOWED_MODELS:
            raise ValueError(f"Model '{model}' is not allowed. Allowed models: {T3ChatAI.ALLOWED_MODELS}")
        session = self.ai_service.create_session(
            session_id=session_id,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature
        )
        return {
            "success": True,
            "session_id": session.session_id,
            "model": session.model,
            "created_at": session.created_at.isoformat()
        }
    
    async def stream_chat_response(self, session_id: str, message: str):
        """Streaming chat endpoint for Server-Sent Events"""
        async for chunk in self.ai_service.chat_stream(session_id, message):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    async def get_chat_history(self, session_id: str) -> Dict:
        """Get chat history endpoint"""
        history = self.ai_service.get_session_history(session_id)
        return {
            "success": True,
            "session_id": session_id,
            "messages": history
        }
    
    async def update_settings(self, session_id: str, settings: Dict) -> Dict:
        """Update session settings endpoint"""
        success = self.ai_service.update_session_settings(
            session_id=session_id,
            **settings
        )
        return {"success": success}

# Usage example
async def main():
    # Initialize the AI service
    ai_service = T3ChatAI()
    
    # Create a chat session
    session = ai_service.create_session(
        session_id="test_session_1",
        system_prompt="You are a helpful AI assistant.",
        model="gpt-4"
    )
    
    print(f"Created session: {session.session_id}")
    
    # Stream a chat response
    print("User: Hello, how are you?")
    print("AI: ", end="")
    
    async for chunk in ai_service.chat_stream("test_session_1", "Hello, how are you?"):
        print(chunk, end="", flush=True)
    
    print("\n")
    
    # Get chat history
    history = ai_service.get_session_history("test_session_1")
    print(f"Chat history: {len(history)} messages")

if __name__ == "__main__":
    asyncio.run(main())