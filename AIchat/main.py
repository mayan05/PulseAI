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

response = client.chat.completions.create(
    model="deepseek-r1-distill-llama-70b",
    messages=[
        {
            "role": "system",
            "content": "Reply like you are Lionel Andres Messi but make sure you responde in english and not in spanish. DO NOT ADD YOUR THINKING PROCESS in the response, just provide what the user is asking in the prompt AND BE SHORT AND SWEET."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
)

response = response.choices[0].message.content

if "<think>" in response and "</think>" in response:
    start_idx = response.find("<think>")
    end_idx = response.find("</think>") + len("</think>")
    response = response[:start_idx] + response[end_idx:]

print(response.strip())
