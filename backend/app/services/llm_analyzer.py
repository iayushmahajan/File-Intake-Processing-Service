import json
from typing import Any, Dict

from openai import OpenAI

from app.core.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL


def _fallback_error(message: str) -> Dict[str, Any]:
    return {
        "error": message,
        "report": None,
    }


def generate_ai_analysis(summary: Dict[str, Any]) -> Dict[str, Any]:
    if not OPENAI_API_KEY:
        return _fallback_error(
            "LLM not configured. Set OPENAI_API_KEY to enable AI analysis."
        )

    client = OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
    )

    user_prompt = (
        "You are a senior data quality analyst reviewing a small customer "
        "transaction CSV upload.\n\n"
        "Use only the provided dataset summary. Do not invent external context. "
        "Keep the report short, practical, and useful for an internal operations team.\n\n"
        "Return ONLY valid JSON with this exact structure:\n"
        "{\n"
        '  "quality_score": number,\n'
        '  "severity": "low" | "medium" | "high",\n'
        '  "executive_summary": "maximum 2 sentences",\n'
        '  "key_issues": ["max 4 concise bullets"],\n'
        '  "recommended_actions": ["max 4 concise bullets"],\n'
        '  "business_impact": "maximum 2 sentences"\n'
        "}\n\n"
        "Rules:\n"
        "- quality_score must be between 0 and 100.\n"
        "- severity should reflect the invalid row rate and seriousness of issues.\n"
        "- Avoid long explanations.\n"
        "- Avoid generic advice.\n"
        "- Mention concrete observed issues when available.\n\n"
        f"Dataset summary:\n{json.dumps(summary, indent=2, default=str)}"
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You produce strict JSON reports for data quality review. "
                        "Return JSON only. No markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        )

        content = response.choices[0].message.content or ""

        try:
            parsed_report = json.loads(content)
            return {
                "report": parsed_report,
                "raw_response": content,
            }
        except json.JSONDecodeError:
            return {
                "report": None,
                "raw_response": content,
                "error": "AI response was returned, but it was not valid JSON.",
            }

    except Exception as error:
        return _fallback_error(f"AI analysis failed: {str(error)}")