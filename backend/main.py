from fastapi import FastAPI, HTTPException # Added HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import asyncio
import httpx
import os
import json

# Initialize the FastAPI app
app = FastAPI(
    title="LearnFlow API",
    description="Backend API for the LearnFlow educational app.",
)

# Set up CORS middleware to allow requests from the React frontend
origins = [
    "http://localhost:3000", # The address where your React app is running
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for a single quiz question
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctAnswer: str

# Pydantic model for a single video recommendation
class VideoRecommendation(BaseModel):
    title: str
    url: str

# Pydantic model for the incoming request body
class QueryRequest(BaseModel):
    query: str

# Pydantic model for the complete response body, matching the frontend's expectations
class FullContentResponse(BaseModel):
    explanation: str
    examples: str
    videos: List[VideoRecommendation]
    quiz: List[QuizQuestion]

# Set up Gemini API configuration
# You can set this in your environment variables or a .env file
# NOTE: Replace 'your_api_key' with your actual API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your_api_key")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

# JSON schema for the structured response from the Gemini API
GEMINI_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "explanation": {"type": "STRING"},
        "examples": {"type": "STRING"},
        "videos": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "url": {"type": "STRING"}
                },
                "required": ["title", "url"]
            }
        },
        "quiz": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "question": {"type": "STRING"},
                    "options": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    },
                    "correctAnswer": {"type": "STRING"}
                },
                "required": ["question", "options", "correctAnswer"]
            }
        }
    },
    "required": ["explanation", "examples", "videos", "quiz"]
}

# Exponential backoff retry for API calls
async def call_with_retries(client, payload, headers, max_retries=5):
    for i in range(max_retries):
        try:
            response = await client.post(GEMINI_API_URL, headers=headers, json=payload, params={"key": GEMINI_API_KEY})
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                delay = 2 ** i
                print(f"Rate limit hit. Retrying in {delay} seconds...")
                await asyncio.sleep(delay)
            else:
                raise
    raise Exception("Failed to get response from Gemini API after multiple retries.")

# API endpoint for generating a complete response
@app.post("/api/v1/generate", response_model=FullContentResponse)
async def generate_content(request: QueryRequest):
    """
    Generates a complete explanation, examples, videos, and quiz for a given query
    by calling the Gemini API.
    """
    if GEMINI_API_KEY == "your_api_key":
        # Handle case where API key is not set
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")

    prompt = f"""
    You are an educational assistant named LearnFlow. For the user's query, provide a comprehensive
    learning package in a structured JSON format. Your response must include:
    1.  A detailed explanation of the concept in Markdown format, with LaTeX for math formulas.
    2.  A section with solved examples, also in Markdown and LaTeX.
    3.  A list of two YouTube video recommendations, each with a title and a valid `youtube.com/embed/` URL.
    4.  A short, two-question multiple-choice quiz with four options for each question.

    Here is the user's query: "{request.query}"

    Your response must be a single JSON object that strictly adheres to the provided schema.
    The Markdown content should be clean and not contain JSON-specific escape characters.
    """

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": GEMINI_RESPONSE_SCHEMA
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            gemini_response = await call_with_retries(client, payload, headers)
        
        # The Gemini API response is a JSON object wrapped in a string
        json_string = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        
        # We parse the string to a Python dictionary
        parsed_response = json.loads(json_string)

        # Convert the dictionary to our Pydantic model
        return FullContentResponse.model_validate(parsed_response)

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        # Return a meaningful error to the frontend
        raise HTTPException(status_code=500, detail="Failed to generate content from AI.")

# To run the server, use this command in your terminal:
# uvicorn main:app --reload
# Assuming this file is named 'main.py'
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
