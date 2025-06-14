from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Optional, List, Dict
from pydantic import BaseModal, Field
import os
import uuid
from groq import Groq

app = FastAPI(title="t3 chat app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

SYSTEM_MESSAGE = "Make sure you are kind,welcoming, accurate and precise in    responding towards the prompts of the user. Make sure you reply ASAP and dont keep the user waiting for your response for too long"

class Models(BaseModal):
    llama = "llama-3.3-70b-versatile"
    chatgpt = ""
    claude = ""

class Role(BaseModal):
    USER = 'user'
    ASS = 'assistant'
    SYS = 'system'

class Message(BaseModal):
    role : Role
    id : str = Field(default_factory=lambda: str(uuid.uuid4()))
    content : str 
    max_token : int = 1500

class ChatSession(BaseModal):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  
    messages: List[Message] = Field(default_factory=list)
    model : str = Models.llama
    max_token : int = 100

    def add_message(self, role: Role, content: str, tokens_used: Optional[int] = None) -> Message:
        """Add a message to the session"""
        message = Message(
            role=role,
            content=content,
            tokens_used=tokens_used
        )
        self.messages.append(message)
        
        # Trim history if too long (keep system messages)
        self._trim_history()
        return message

    def _trim_history(self):
        if len(self.messages) > self.max_token:
            ass_messages = [msg for msg in self.messages if msg.role == Role.ASS]
            recent_messages = [msg for msg in self.messages if msg.role != Role.ASS][-self.max_token:]
            self.messages = ass_messages + recent_messages

    def get_messages_for_api(self) -> List[Dict]:
        return [
            {
                "role": msg.role.value,
                "content": msg.content
            }
            for msg in self.messages
        ]

            ### ------------------AVENGE THEM------------------ ###






load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.post("/api/chat")
def groq_time(prompt: str, chat_history: ChatSession): # calls llama 3.3 70B
    messages = [
        {
            "role" : Role.SYS,
            "content" : SYSTEM_MESSAGE
        },
        *chat_history,
        {
            "role": Role.USER,
            "content": prompt,
        }
    ]
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )

    reply = response.choices[0].message.content
    chat_history.append({"role": "user", "content": prompt})
    chat_history.append({"role": "assistant", "content": reply})
    print(reply)

    return reply

def main():
    print("\nWelcome to the T3 chat app!!!\nType 'quit' or 'exit' when your done. HAVE FUN!!!\n")

    history = ChatSession()       # memory for the model

    prompt = input("You: ")
    while prompt not in ['quit', 'exit', 'Quit', 'Exit']:
        groq_time(prompt, history)
        prompt = input("You: ")

    print("Until Next Time!! Ciao.")

if __name__ == '__main__':
    main()
    
