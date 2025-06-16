from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import uuid

SYSTEM_MESSAGE = "Make sure you are kind,welcoming, accurate and precise in responding towards the prompts of the user. Make sure you reply ASAP and dont keep the user waiting for your response for too long"

class Models(BaseModel):
    llama = "llama-3.3-70b-versatile"
    chatgpt = ""
    claude = ""

class Role(BaseModel):
    USER = 'user'
    ASS = 'assistant'
    SYS = 'system'

class Message(BaseModel):
    role: str
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str 
    tokens_used: Optional[int] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    temperature = 0.7
    max_tokens: int = 1000

class ChatResponse(BaseModel):
    response: str
    session_id: str
    message_id: Optional[str] = None
    tokens_used: Optional[int] = None
    total_session_tokens: int

class SessionInfo(BaseModel):
    session_id: str
    message_count: int
    created_at: datetime
    last_activity: datetime
    total_tokens: int

class ChatSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  
    messages: List[Message] = Field(default_factory=list)
    model: Models = Models       
    max_history_length: int = 100
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)

    def add_message(self, role: Role, content: str, tokens_used: Optional[int] = None) -> Message:
        message = Message(
            role=role,
            content=content,
            tokens_used=tokens_used
        )
        self.messages.append(message)
        self.last_activity = datetime.now()
        
        # Triming history if too long (keep system messages)
        self._trim_history()
        return message

    def _trim_history(self):
        if len(self.messages) > self.max_history_length:
            system_messages = [msg for msg in self.messages if msg.role == "system"]
            recent_messages = [msg for msg in self.messages if msg.role != "system"][-self.max_history_length:]
            self.messages = system_messages + recent_messages

    def get_messages_for_api(self) -> List[Dict]:
        return [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in self.messages
        ]

    def get_total_tokens(self) -> int:
        return sum(msg.tokens_used or 0 for msg in self.messages)
