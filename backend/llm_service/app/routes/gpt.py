from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
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

@router.post("/generate", response_class=JSONResponse)
async def generate_text(
    prompt: str = Form(...),
    temperature: float = Form(0.7),
    file: UploadFile = File(None)
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
        
        return JSONResponse(content={
            "text": response.choices[0].message.content,
            "model": "gpt-4",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        )