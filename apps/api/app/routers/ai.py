from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from app.core.config import settings
from app.schemas import AiRequest

router = APIRouter()

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a Mermaid.js expert. Your task is to generate or edit Mermaid diagram code based on the user's request.
- Return ONLY the Mermaid code block.
- Do NOT include any explanations or markdown formatting like ```mermaid.
- Ensure the syntax is valid for the latest Mermaid version.
- If the user provides "current_code", you should modify it according to their instructions while keeping the rest intent.
- Use meaningful labels and clear connections.
"""

@router.post("/generate")
async def generate_diagram(
    req: AiRequest
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    prompt = req.prompt
    if req.current_code:
        prompt = f"CURRENT CODE:\n{req.current_code}\n\nUSER REQUEST: {req.prompt}"

    messages.append({"role": "user", "content": prompt})

    try:
        response = await client.chat.completions.create(
            model="gpt-4o", # Using gpt-4o as gpt-5.1 is hypothetical
            messages=messages,
            temperature=0.2,
        )
        
        mermaid_code = response.choices[0].message.content.strip()
        
        # Simple cleanup if AI included markdown backticks
        if mermaid_code.startswith("```"):
             mermaid_code = mermaid_code.split("\n", 1)[1].rsplit("\n", 1)[0]
             if mermaid_code.startswith("mermaid"):
                 mermaid_code = mermaid_code[7:].strip()

        return {"mermaid_code": mermaid_code}
        
    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
