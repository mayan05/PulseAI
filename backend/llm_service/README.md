# LLM Service

A FastAPI microservice for handling LLM (Large Language Model) requests using OpenAI's API.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

## Running the Service

Start the service with:
```bash
uvicorn main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`

## API Endpoints

### POST /generate

Generate text using OpenAI's models.

Request body:
```json
{
    "prompt": "Your prompt here",
    "model": "gpt-4.1",  // optional, defaults to gpt-4.1
    "temperature": 0.7,   // optional, defaults to 0.7
    "max_tokens": 1000    // optional, defaults to 1000
}
```

Response:
```json
{
    "text": "Generated text response",
    "model": "model used",
    "timestamp": "ISO timestamp"
}
```

## API Documentation

Once the service is running, you can access:
- Swagger UI documentation at `http://localhost:8000/docs`
- ReDoc documentation at `http://localhost:8000/redoc` 