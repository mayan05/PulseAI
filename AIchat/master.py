from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from groq import Groq

load_dotenv()

SYSTEM_MESSAGE = "Make sure you are kind,consice and precise in responding towards the prompts of the user"

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def groq_time(prompt: str, chat_history: list):
    messages = [
        {
            "role" : "system",
            "content" : SYSTEM_MESSAGE
        },
        *chat_history,
        {
            "role": "user",
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

    history = []        # memory for the model

    prompt = input("You: ")
    while prompt not in ['quit', 'exit', 'Quit', 'Exit']:
        groq_time(prompt, history)
        prompt = input("You: ")

    print("Until Next Time!! Ciao.")

if __name__ == '__main__':
    main()
    
