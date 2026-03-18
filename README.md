# JD Analyzer — Resume & Job Description Matcher

A full-stack AI-powered web app that analyzes your resume against a job description, extracts skills, scores your match, and drafts a tailored cover letter.

🔗 **Live Demo**: [https://jd-analyzer-psi.vercel.app](https://jd-analyzer-psi.vercel.app)

---

## Features

- Upload a PDF resume and paste a job description
- AI-powered skill extraction using HuggingFace NER models
- Match scoring with zero-shot classification (`facebook/bart-large-mnli`)
- Identifies matched skills, missing skills, and strengths
- Auto-generates a cover letter draft using `google/flan-t5-large`
- Clean, responsive UI built with React + Tailwind CSS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Uvicorn, PyPDF2 |
| AI Models | HuggingFace Inference API |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [HuggingFace](https://huggingface.co) account with an API token

