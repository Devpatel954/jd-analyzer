"""
Resume & Job Description Analyzer — FastAPI Backend
====================================================
Accepts a PDF resume + job description string, extracts text, runs two
HuggingFace Inference API models, and returns a structured analysis:

  • Skill extraction  — amjad-awad/skill-extractor   (NER token-classification)
  • Strength scoring  — facebook/bart-large-mnli      (zero-shot classification)

Augments NER results with fast regex scanning so the endpoint stays useful
even when a model is cold-starting on HuggingFace's free tier.
"""

import io
import os
import re
import time
from typing import Any

import PyPDF2
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# ── Environment ────────────────────────────────────────────────────────────────
load_dotenv()

HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "")
if not HF_TOKEN:
    raise RuntimeError(
        "HUGGINGFACE_API_TOKEN is not set. "
        "Add it to the .env file in this directory."
    )

HF_HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

# ── HuggingFace model URLs ─────────────────────────────────────────────────────
SKILL_NER_URL = (
    "https://api-inference.huggingface.co/models/amjad-awad/skill-extractor"
)
ZERO_SHOT_URL = (
    "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
)
# Text-to-text generation model for cover letter drafting
FLAN_T5_URL = (
    "https://api-inference.huggingface.co/models/google/flan-t5-large"
)

# ── Static knowledge bases ─────────────────────────────────────────────────────
# Used for fast regex augmentation and as a safety net if the NER model fails.
TECH_SKILLS: list[str] = [
    "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular",
    "Node.js", "Next.js", "FastAPI", "Django", "Flask", "Spring", "Java",
    "C++", "C#", "Go", "Rust", "Kotlin", "Swift",
    "SQL", "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis",
    "Elasticsearch", "Cassandra", "DynamoDB",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Git", "CI/CD", "Jenkins", "GitHub Actions", "GitLab CI", "Linux", "Bash",
    "REST API", "GraphQL", "gRPC", "Microservices", "Kafka", "RabbitMQ",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "scikit-learn", "Pandas", "NumPy", "Spark", "Hadoop",
    "Agile", "Scrum", "Kanban", "JIRA", "Confluence",
    "Figma", "UX Design", "CSS", "HTML", "Tailwind CSS", "Sass",
    "Webpack", "Vite", "Jest", "Cypress", "Playwright",
    "Product Management", "Data Analysis", "System Design",
    "Leadership", "Communication", "Problem Solving", "Teamwork",
    "SEO", "Analytics", "Performance Optimization", "Security",
]

# Zero-shot candidate labels and their display sentences for the Strengths card.
STRENGTH_LABELS: list[str] = [
    "strong technical skills",
    "leadership and management experience",
    "excellent communication skills",
    "problem solving ability",
    "teamwork and collaboration",
    "adaptability and continuous learning",
    "project management experience",
    "data analysis and research skills",
]

STRENGTH_SENTENCES: dict[str, str] = {
    "strong technical skills":
        "Your technical skill set aligns well with modern engineering roles.",
    "leadership and management experience":
        "Demonstrated leadership experience positions you for senior responsibilities.",
    "excellent communication skills":
        "Strong communication skills — a valued asset in cross-functional teams.",
    "problem solving ability":
        "Evidence of creative problem-solving and analytical reasoning across roles.",
    "teamwork and collaboration":
        "Collaborative track record reflects the team culture most companies seek.",
    "adaptability and continuous learning":
        "Continuous learning mindset is a key differentiator in fast-moving fields.",
    "project management experience":
        "Project ownership experience matches expectations for this scope of role.",
    "data analysis and research skills":
        "Data-driven decision-making background adds strong value to this position.",
}

IMPROVEMENT_TIPS: list[str] = [
    'Quantify achievements with metrics — e.g., "Reduced load time by 40%, '
    'improving Lighthouse score from 72 to 95".',
    "Add a dedicated Skills section near the top, grouping technologies by "
    "category for easy recruiter scanning.",
    "Tailor your summary to mirror the job title and company mission in "
    "2–3 sentences.",
    "Include links to live projects or GitHub repos so recruiters can verify "
    "skills hands-on.",
    'Use strong action verbs ("Architected", "Owned", "Reduced") to open '
    "each bullet point.",
    "Remove outdated technologies and focus on tools mentioned in the JD.",
    "Keep your resume to 1–2 pages with consistent formatting throughout.",
    "Add relevant certifications or online courses that match the JD requirements.",
]

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="Resume & JD Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # Allow both the standard Vite port and the fallback port used in this project
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://jd-analyzer-psi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── PDF extraction ─────────────────────────────────────────────────────────────

def extract_pdf_text(file_bytes: bytes) -> str:
    """
    Parse a PDF byte-stream with PyPDF2 and return its plain text.
    Raises HTTP 422 on malformed files.
    """
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return " ".join(pages).strip()
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse PDF — is the file corrupted? ({exc})",
        )


# ── HuggingFace API helpers ────────────────────────────────────────────────────

def _call_hf(url: str, payload: dict, retries: int = 3) -> Any:
    """
    POST to a HuggingFace Inference API endpoint.

    • Retries up to `retries` times on HTTP 503 (model loading).
    • Raises HTTP 504 on timeout, HTTP 502 on persistent model unavailability.
    • Never swallows auth or payload errors (4xx passthrough).
    """
    for attempt in range(retries):
        try:
            resp = requests.post(
                url, headers=HF_HEADERS, json=payload, timeout=45
            )
        except requests.exceptions.Timeout:
            if attempt == retries - 1:
                raise HTTPException(
                    status_code=504,
                    detail="HuggingFace API timed out. The model may be "
                           "warming up — try again in ~30 seconds.",
                )
            time.sleep(5)
            continue

        if resp.status_code == 503:
            # Model is loading; honour the estimated_time hint (max 40 s)
            wait = min(resp.json().get("estimated_time", 20), 40)
            time.sleep(wait)
            continue

        if resp.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid HuggingFace API token. Check your .env file.",
            )

        if not resp.ok:
            raise HTTPException(
                status_code=502,
                detail=f"HuggingFace error ({resp.status_code}): "
                       f"{resp.text[:300]}",
            )

        return resp.json()

    raise HTTPException(
        status_code=503,
        detail="HuggingFace model is still loading after several retries. "
               "Please wait ~60 seconds and try again.",
    )


# ── Skill extraction ───────────────────────────────────────────────────────────

def _regex_skills(text: str) -> list[str]:
    """
    Fast word-boundary scan of `text` against the TECH_SKILLS vocabulary.
    Case-insensitive. Used to augment or replace NER output.
    """
    text_lower = text.lower()
    return [
        skill for skill in TECH_SKILLS
        if re.search(r"\b" + re.escape(skill.lower()) + r"\b", text_lower)
    ]


def _ner_skills(text: str) -> list[str]:
    """
    Run the amjad-awad/skill-extractor NER model via the HF Inference API.
    Reconstructs subword-tokenised entities (##prefix merging) into full
    skill strings and deduplicates them.

    Truncates input to 400 words to stay within the model's token window.
    Returns an empty list (rather than raising) on any API failure so the
    caller can fall back to regex extraction gracefully.
    """
    truncated = " ".join(text.split()[:400])
    try:
        tokens: list[dict] = _call_hf(SKILL_NER_URL, {"inputs": truncated})
    except HTTPException:
        return []   # graceful degradation — caller will use regex fallback

    if not isinstance(tokens, list):
        return []

    skills: set[str] = set()
    current: list[str] = []

    for token in tokens:
        entity = token.get("entity", "")
        word = token.get("word", "").replace("##", "")   # merge wordpiece suffix
        score = token.get("score", 0.0)

        if score < 0.55:
            if current:
                skills.add(" ".join(current).strip())
                current = []
            continue

        if entity.startswith("B-"):
            if current:
                skills.add(" ".join(current).strip())
            current = [word]
        elif entity.startswith("I-") and current:
            current.append(word)
        else:
            if current:
                skills.add(" ".join(current).strip())
                current = []

    if current:
        skills.add(" ".join(current).strip())

    return [s for s in skills if len(s) > 1]


def extract_skills(text: str) -> list[str]:
    """
    Combine NER + regex to produce the most complete skill list.
    Regex results serve as a baseline; NER adds any additional findings.
    Deduplicated, case-preserved (NER output takes priority).
    """
    ner = _ner_skills(text)
    regex = _regex_skills(text)

    # Merge: NER-found skills first, then regex skills not already covered
    merged: list[str] = list(ner)
    ner_lower = {s.lower() for s in ner}
    for skill in regex:
        if skill.lower() not in ner_lower:
            merged.append(skill)

    return merged


# ── Strength identification ────────────────────────────────────────────────────

def identify_strengths(resume_text: str) -> list[str]:
    """
    Use facebook/bart-large-mnli zero-shot classification to surface the
    top-3 strengths present in the resume text.

    Falls back to three generic sentences if the API is unavailable so the
    endpoint always returns a usable Strengths card.
    """
    truncated = " ".join(resume_text.split()[:350])
    try:
        result = _call_hf(
            ZERO_SHOT_URL,
            {
                "inputs": truncated,
                "parameters": {
                    "candidate_labels": STRENGTH_LABELS,
                    "multi_label": True,
                },
            },
        )
    except HTTPException:
        # Fallback — return first 3 generic strengths
        return list(STRENGTH_SENTENCES.values())[:3]

    pairs = sorted(
        zip(result.get("labels", []), result.get("scores", [])),
        key=lambda x: x[1],
        reverse=True,
    )
    return [
        STRENGTH_SENTENCES.get(label, label.capitalize())
        for label, _ in pairs[:3]
    ]


# ── Match computation ──────────────────────────────────────────────────────────

def compute_match(
    resume_skills: list[str], jd_skills: list[str]
) -> dict:
    """
    Compare resume vs. JD skill lists with case-insensitive substring
    matching (so "REST APIs" matches "REST API", etc.).

    Score formula:
        raw  = (matched / total_jd) * 100
        final = clamp(raw * 0.70 + 30, 35, 97)

    The 0.70 / +30 blend keeps scores in a realistic-feeling 35–97 range
    and avoids either 0 % or 100 % which would look like bugs to users.
    """
    resume_lower = {s.lower() for s in resume_skills}
    found: list[str] = []
    missing: list[str] = []

    for skill in jd_skills:
        skill_lower = skill.lower()
        matched = any(
            skill_lower in r or r in skill_lower
            for r in resume_lower
        )
        (found if matched else missing).append(skill)

    if not jd_skills:
        score = 50   # neutral when JD yielded no skills
    else:
        raw = (len(found) / len(jd_skills)) * 100
        score = int(min(97, max(35, raw * 0.70 + 30)))

    return {
        "foundSkills": found[:12],
        "missingSkills": missing[:10],
        "score": score,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
def health_check():
    """Liveness probe — used by the frontend to verify the backend is up."""
    return {"status": "ok"}


@app.post("/analyze", tags=["analysis"])
async def analyze(
    resume: UploadFile = File(
        ..., description="Candidate's resume — PDF format only."
    ),
    job_description: str = Form(
        ..., description="Full text of the job posting to match against."
    ),
):
    """
    Main analysis endpoint.

    1. Validates file type (PDF only).
    2. Extracts resume text with PyPDF2.
    3. Extracts skills from both resume and JD via NER + regex.
    4. Classifies top-3 resume strengths via zero-shot classification.
    5. Computes a match score and returns a structured JSON response
       that maps directly to the frontend's ResultsDashboard props.
    """
    # ── Validate file type ─────────────────────────────────────────────────────
    filename = (resume.filename or "").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are supported. Please upload a .pdf file.",
        )

    # ── Read & extract text ────────────────────────────────────────────────────
    file_bytes = await resume.read()
    resume_text = extract_pdf_text(file_bytes)

    if len(resume_text.split()) < 20:
        raise HTTPException(
            status_code=422,
            detail=(
                "Extracted text is too short. "
                "The PDF may be image-based (scanned). "
                "Please use a text-selectable PDF."
            ),
        )

    # ── NER + regex skill extraction ───────────────────────────────────────────
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(job_description)

    # ── Zero-shot strength identification ──────────────────────────────────────
    strengths = identify_strengths(resume_text)

    # ── Compute match metrics ──────────────────────────────────────────────────
    match = compute_match(resume_skills, jd_skills)

    # ── Build missing-keyword messages ─────────────────────────────────────────
    missing_msgs = [
        f'"{skill}" is mentioned in the job description but not detected '
        f"in your resume."
        for skill in match["missingSkills"][:6]
    ]

    # ── Select improvement tips ────────────────────────────────────────────────
    # Bias toward the keyword-injection tip when there are many gaps
    if len(match["missingSkills"]) >= 4:
        tips = [IMPROVEMENT_TIPS[0], IMPROVEMENT_TIPS[5], IMPROVEMENT_TIPS[1]]
    else:
        tips = IMPROVEMENT_TIPS[:3]

    return {
        "score":           match["score"],
        "strengths":       strengths,
        "missingKeywords": missing_msgs,
        "tips":            tips,
        "foundSkills":     match["foundSkills"],
        "requiredSkills":  match["missingSkills"],
    }


# ── Cover letter helpers ───────────────────────────────────────────────────────

def _build_cover_letter_template(
    name: str,
    role: str,
    skills: list[str],
    strengths: list[str],
    jd_snippet: str,
) -> str:
    """
    Construct a professional 3-paragraph cover letter from extracted data.
    Used when the generative model is unavailable or returns low-quality output.
    """
    top_skills = skills[:5] if skills else ["problem-solving", "communication", "teamwork"]
    if len(top_skills) > 1:
        skills_str = ", ".join(top_skills[:-1]) + " and " + top_skills[-1]
    else:
        skills_str = top_skills[0]

    strength_str = strengths[0] if strengths else "delivering high-quality results"
    jd_preview = jd_snippet.strip()[:90].rstrip(".,;")

    return (
        f"Dear Hiring Manager,\n\n"
        f"I am writing to express my strong interest in the {role} position. "
        f"With a solid background in {skills_str}, I am confident my experience aligns "
        f"closely with the requirements outlined in your job posting.\n\n"
        f"Throughout my career I have demonstrated {strength_str.lower()}. "
        f"My hands-on work with {', '.join(top_skills[:3])} has prepared me to "
        f"contribute meaningfully from day one. I am particularly excited by the "
        f"opportunity to work on {jd_preview}, and I believe my skill set makes me "
        f"a strong match for what your team is looking for.\n\n"
        f"I would welcome the chance to discuss how my background and enthusiasm can "
        f"support your organisation's goals. Thank you for your time and consideration — "
        f"I look forward to speaking with you.\n\nSincerely,\n{name}"
    )


def _generate_with_flan(name: str, role: str, jd: str, skills: list[str]) -> str | None:
    """
    Ask google/flan-t5-large to draft a cover letter.
    Returns None on any failure so the caller can fall back to the template.
    """
    skills_str = ", ".join(skills[:8]) if skills else "various professional skills"
    prompt = (
        f"Write a professional 3-paragraph cover letter for {name} applying "
        f"for the {role} position.\n"
        f"Applicant skills: {skills_str}.\n"
        f"Job description summary: {jd[:280].strip()}\n"
        f"Cover letter:"
    )
    try:
        result = _call_hf(
            FLAN_T5_URL,
            {"inputs": prompt, "parameters": {"max_new_tokens": 380}},
        )
        if isinstance(result, list) and result:
            text = result[0].get("generated_text", "").strip()
            # Accept only if the model produced a substantive response
            if len(text) > 120:
                return text
    except Exception:
        pass
    return None


# ── /cover-letter route ────────────────────────────────────────────────────────

@app.post("/cover-letter", tags=["cover-letter"])
async def generate_cover_letter(
    resume: UploadFile = File(
        ..., description="Candidate's resume — PDF format only."
    ),
    job_description: str = Form(
        ..., description="Job description to tailor the letter toward."
    ),
    applicant_name: str = Form(
        default="Applicant",
        description="Full name that will appear in the letter signature.",
    ),
    target_role: str = Form(
        default="this position",
        description="Job title the applicant is applying for.",
    ),
):
    """
    Generate a tailored cover letter from a PDF resume + job description.

    Strategy:
      1. Extract text from the uploaded PDF.
      2. Extract skills (NER + regex) and strengths (zero-shot) from the resume.
      3. Try google/flan-t5-large to produce a custom draft.
      4. Fall back to a structured template if the model is unavailable.
    """
    filename = (resume.filename or "").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are supported. Please upload a .pdf file.",
        )

    file_bytes = await resume.read()
    resume_text = extract_pdf_text(file_bytes)

    if len(resume_text.split()) < 20:
        raise HTTPException(
            status_code=422,
            detail=(
                "Extracted text is too short — the PDF may be image-based. "
                "Please use a text-selectable PDF."
            ),
        )

    skills = extract_skills(resume_text)
    strengths = identify_strengths(resume_text)

    # Try the generative model; fall back to a high-quality template
    letter = _generate_with_flan(applicant_name, target_role, job_description, skills)
    if not letter:
        letter = _build_cover_letter_template(
            applicant_name, target_role, skills, strengths, job_description
        )

    return {"cover_letter": letter, "skills_used": skills[:8]}
