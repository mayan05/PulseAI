from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Dict, Optional
from datetime import datetime
import time
import os
from core import (
    ChatSession, 
    ChatRequest, 
    ChatResponse, 
    SessionInfo,
    Models,
    Role,
    SYSTEM_MESSAGE
)

class ChatManager:
    def __init__(self, cleanup_interval: int = 3600):  # 1 hour
        self.sessions: Dict[str, ChatSession] = {}
        self.cleanup_interval = cleanup_interval
        self.last_cleanup = time.time()
    
    def create_session(self, user_id: Optional[str] = None) -> ChatSession:
        session = ChatSession(user_id=user_id)
        session.add_message(Role.SYS, SYSTEM_MESSAGE)
        self.sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        self._cleanup_old_sessions()
        return self.sessions.get(session_id)
    
    def get_or_create_session(self, session_id: Optional[str] = None, user_id: Optional[str] = None) -> ChatSession:
        if session_id and session_id in self.sessions:
            session = self.sessions[session_id]
            session.last_activity = datetime.now()
            return session
        
        return self.create_session(user_id)
    
    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def _cleanup_old_sessions(self):
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_time = datetime.now().timestamp() - (24 * 3600)  
        
        expired_sessions = [
            session_id for session_id, session in self.sessions.items()
            if session.last_activity.timestamp() < cutoff_time
        ]
        
        for session_id in expired_sessions:
            del self.sessions[session_id]
        
        self.last_cleanup = current_time
        print(f"Cleaned up {len(expired_sessions)} expired sessions")
    
    def get_session_count(self) -> int:
        return len(self.sessions)

