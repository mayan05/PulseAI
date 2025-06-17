from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response
from openai import OpenAI
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from datetime import datetime
import PyPDF2
import io
from typing import Optional

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/gpt", tags=["gpt"])

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7

async def extract_file_content(file: UploadFile) -> str:
    content = await file.read()
    if file.content_type == "application/pdf":
        # Handle PDF files
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text() + "\n"
        return text_content
    elif file.content_type.startswith("text/"):
        # Handle text files
        return content.decode('utf-8')
    else:
        # For other file types, return file info
        return f"[File: {file.filename} (type: {file.content_type})]"

@router.post("/generate",
    summary="Generate response from GPT-4",
    response_class=Response,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "text": "Response text",
                        "model": "gpt-4",
                        "timestamp": "2024-03-21T12:00:00"
                    }
                }
            }
        }
    }
)
async def generate_text(
    prompt: str = Form(..., description="Your message to GPT-4"),
    temperature: float = Form(0.7, description="Temperature for response generation"),
    file: UploadFile = File(None, description="Upload a file (PDF, text, etc.)", media_type="multipart/form-data")
):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
            
        client = OpenAI(api_key=api_key)
        
        messages = [{"role": "user", "content": prompt}]
        
        # If file is provided, read its content and add to messages
        if file:
            try:
                file_text = await extract_file_content(file)
                messages.append({
                    "role": "user",
                    "content": f"Here's the file content:\n\n{file_text}"
                })
            except Exception as file_error:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error processing file: {str(file_error)}"
                )
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=temperature
        )
        
        return {
            "text": response.choices[0].message.content,
            "model": "gpt-4",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        )