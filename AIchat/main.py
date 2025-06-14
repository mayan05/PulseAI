from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from groq import Groq

prompt = input("Enter your prompt: ")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "system",
            "content": "Return a precise and a consice reply of whatever the user demands and be respectful."
        },
        {
            "role": "user",
            "content": prompt,
        }
    ],
    model="llama-3.3-70b-versatile"
)
print(chat_completion.choices[0].message.content)