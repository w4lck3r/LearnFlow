from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import uvicorn
import httpx
import os
import json
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize logging
logging.basicConfig(
    filename='learnflow.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="LearnFlow API (OpenRouter Edition)",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Constants ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME = "deepseek/deepseek-chat-v3-0324:free"

# --- Pydantic Models ---
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctAnswer: str

class VideoRecommendation(BaseModel):
    title: str
    url: str

class QueryRequest(BaseModel):
    query: str

class FullContentResponse(BaseModel):
    explanation: str
    examples: List[str]
    videos: List[VideoRecommendation]
    quiz: List[QuizQuestion]

# --- Helper Functions ---
async def call_openrouter(prompt: str) -> dict:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",  # Required by OpenRouter
        "X-Title": "LearnFlow"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are an expert tutor. Respond only with valid JSON matching the schema."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logging.error(f"OpenRouter API error: {e.response.text}")
            raise HTTPException(502, "AI service unavailable")

# --- API Endpoints ---
@app.post("/api/v1/generate", response_model=FullContentResponse)
async def generate_content(request: QueryRequest):
    """
    Generate educational content using DeepSeek via OpenRouter
    """
    prompt = f"""
    Create a learning package about: {request.query}

    JSON Schema:
    {{
      "explanation": "string - clear explanation with examples",
      "examples": ["string", "string"],
      "videos": [{{"title": "string", "url": "string (must include https://)"}}],
      "quiz": [
        {{
          "question": "string",
          "options": ["string", "string", "string"],
          "correctAnswer": "string"
        }}
      ]
    }}

    Rules:
    - Return only valid JSON, no extra text.
    - Ensure all URLs include https://
    """

    try:
        # Call OpenRouter API
        api_response = await call_openrouter(prompt)

        # Ensure choices exist
        if "choices" not in api_response or not api_response["choices"]:
            logging.error(f"Unexpected API response: {api_response}")
            raise HTTPException(502, "AI service returned no choices")

        ai_content = api_response["choices"][0]["message"]["content"]

        # Parse and validate
        try:
            parsed = json.loads(ai_content)
            return FullContentResponse.model_validate(parsed)
        except (json.JSONDecodeError, ValueError) as e:
            logging.error(f"Invalid AI response: {ai_content}")
            raise HTTPException(422, "AI returned invalid format")

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Generation failed: {str(e)}")
        raise HTTPException(500, "Content generation failed")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": MODEL_NAME}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
