import time
import os
import json
import urllib.request
import urllib.parse
import warnings
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from app.config import settings

warnings.filterwarnings("ignore")

MAX_CONTEXT_CHARS = 1250

PROMPT_TEMPLATE = """You are an expert AI assistant answering ONLY using the provided document context.
If the answer is not in the context, reply: "I cannot find this information in the document."

Provide a comprehensive, clear, and grounded answer based on the context.

Context:
{context}

Question: {question}

Answer:"""


class LocalFlanEngine:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.LLM_MODEL
        self.tokenizer = None
        self.model = None

    def _load(self):
        if self.model is None:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.model_name,
                dtype=torch.float32,
                device_map="cpu"
            )

    def generate(self, prompt: str) -> str:
        self._load()
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True)
        outputs = self.model.generate(**inputs, max_new_tokens=250, do_sample=False)
        answer = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "Answer:" in answer:
            answer = answer.split("Answer:")[-1].strip()
        return answer


class LLMProvider:
    def __init__(self):
        self.local_engine = LocalFlanEngine()

    def generate_answer(
        self,
        question: str,
        search_results: list,
        engine_choice: str = "Local FLAN-T5 (CPU Offline)",
        groq_api_key: str = None,
        gemini_api_key: str = None
    ) -> dict:
        t0 = time.time()
        context_blocks = []
        citations = []

        for i, result in enumerate(search_results[:5]):
            c = result["chunk"]
            context_blocks.append(f"[{c['source']}] {c['content']}")
            citations.append({
                "rank": i + 1,
                "source": c["source"],
                "page": c["page"],
                "type": c["type"],
                "relevance_score": result["score"],
                "content": c["content"],
                "image_path": c.get("image_path")
            })

        if not context_blocks:
            return {
                "answer": "I cannot find relevant information in the document.",
                "citations": [],
                "gen_time_s": 0.0
            }

        context_text = "\n\n".join(context_blocks)
        prompt = PROMPT_TEMPLATE.format(context=context_text, question=question)

        # Route to requested provider
        answer = ""
        if "Groq" in engine_choice:
            api_key = groq_api_key or os.getenv("GROQ_API_KEY", "")
            if api_key:
                try:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    data = {
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": "You are a factual document QA assistant."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 400
                    }
                    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
                    with urllib.request.urlopen(req) as resp:
                        res_data = json.loads(resp.read().decode("utf-8"))
                        answer = res_data["choices"][0]["message"]["content"].strip()
                except Exception as e:
                    print(f"[Warning] Groq API call failed: {e}. Falling back to local engine.")
                    answer = ""

        elif "Gemini" in engine_choice:
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY", "")
            if api_key:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                    headers = {"Content-Type": "application/json"}
                    data = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 400}
                    }
                    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
                    with urllib.request.urlopen(req) as resp:
                        res_data = json.loads(resp.read().decode("utf-8"))
                        answer = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except Exception as e:
                    print(f"[Warning] Gemini API call failed: {e}. Falling back to local engine.")
                    answer = ""

        # Fallback to local FLAN-T5
        if not answer:
            try:
                answer = self.local_engine.generate(prompt)
            except Exception:
                # Basic fallback text concatenation
                snippets = [f"[{c['source']}] {c['content'][:150]}..." for c in citations[:2]]
                answer = "Based on retrieved context:\n" + "\n".join(snippets)

        t1 = time.time()
        return {
            "answer": answer,
            "citations": citations,
            "gen_time_s": round(t1 - t0, 2)
        }


llm_provider_service = LLMProvider()
