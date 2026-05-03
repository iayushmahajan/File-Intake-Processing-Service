import json
from typing import Any, Dict

from openai import OpenAI

from app.core.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL


def generate_ai_analysis(summary: Dict[str, Any]) -> Dict[str, Any]:
    if not OPENAI_API_KEY:
        return {
            "error": "LLM not configured. Set OPENAI_API_KEY to enable AI analysis."
        }

    client = OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
    )

    user_prompt = (
        "Analyze this customer transaction CSV processing summary and produce "
        "a concise, business-oriented data quality report.\n\n"
        "Return the answer as clear markdown with these exact sections:\n"
        "1. Executive Summary\n"
        "2. Key Data Quality Issues\n"
        "3. Likely Root Causes\n"
        "4. Recommended Actions\n"
        "5. Business Impact\n\n"
        "Be specific. Avoid generic advice. Base the report only on the provided data.\n\n"
        f"Dataset summary:\n{json.dumps(summary, indent=2, default=str)}"
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior data quality analyst for internal "
                        "business data pipelines."
                    ),
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        )

        return {
            "raw_response": response.choices[0].message.content or ""
        }

    except Exception as error:
        return {
            "error": f"AI analysis failed: {str(error)}"
        }