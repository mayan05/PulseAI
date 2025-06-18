from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from openai import OpenAI
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from datetime import datetime
import PyPDF2
import io
from typing import Optional, List, Dict, Any
import base64
import logging
import requests
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/gpt", tags=["gpt"])

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    conversation_history: Optional[List[Dict[str, Any]]] = []

class ImageGenerateRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    quality: str = "standard"
    style: str = "natural"
    n: int = 1

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
async def generate_text(data: GenerateRequest):
    try:
        # Check if the prompt starts with /image
        if data.prompt.startswith("/image"):
            # Extract the image prompt by removing "/image" and any leading spaces
            image_prompt = data.prompt[6:].strip()
            if not image_prompt:
                raise HTTPException(
                    status_code=400,
                    detail="Please provide a description after /image"
                )
            
            # Call the image generation function
            return await generate_image(ImageGenerateRequest(prompt=image_prompt))
            
        # If not an image command, proceed with normal text generation
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
            
        client = OpenAI(api_key=api_key)
        
        # Build messages array from conversation history + current prompt
        messages = []
        
        # Add conversation history if provided
        if data.conversation_history:
            messages.extend(data.conversation_history)
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": data.prompt
        })
        
        # Call OpenAI API with full conversation history
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=data.temperature
        )
        
        # Extract assistant's response
        assistant_msg = response.choices[0].message.content
        
        return JSONResponse(content={
            "text": assistant_msg,
            "model": "gpt-4",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        )

@router.post("/image", response_class=JSONResponse)
async def generate_image(data: ImageGenerateRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not found in environment variables")
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
            
        logger.info(f"Generating image with prompt: {data.prompt}")
        client = OpenAI(api_key=api_key)
        
        # Call OpenAI API for image generation
        response = client.images.generate(
            model="dall-e-3",
            prompt=data.prompt,
            size=data.size,
            quality=data.quality,
            style=data.style,
            n=data.n
        )
        
        if not response.data or len(response.data) == 0:
            logger.error("No image data received from OpenAI")
            raise HTTPException(
                status_code=500,
                detail="No image data received from OpenAI"
            )
        
        # Get the image URL from the response
        image_url = response.data[0].url
        
        # Download the image and convert to base64
        try:
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            image_data = image_response.content
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            logger.info("Successfully generated and encoded image")
            
            return JSONResponse(content={
                "image": f"data:image/png;base64,{base64_image}",
                "model": "dall-e-3",
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            # Fallback to returning the URL if base64 conversion fails
            return JSONResponse(content={
                "image_url": image_url,
                "model": "dall-e-3",
                "timestamp": datetime.now().isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating image: {str(e)}"
        )

@router.post("/generate-form", response_class=JSONResponse)
async def generate_text_form(
    prompt: str = Form(...),
    temperature: float = Form(0.7),
    file: UploadFile = File(None)
):
    try:
        # If file is provided, append its content to the prompt
        if file:
            try:
                file_text = await extract_file_content(file)
                full_prompt = f"{prompt}\n\nHere's the file content:\n\n{file_text}"
            except Exception as file_error:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error processing file: {str(file_error)}"
                )
        else:
            full_prompt = prompt

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
        client = OpenAI(api_key=api_key)
        messages = [{"role": "user", "content": full_prompt}]
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