import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, Github, Zap,
  Loader2, X, Star, AlertCircle, Lightbulb,
  TrendingUp, ChevronRight, WifiOff,
} from 'lucide-react'
import './App.css'

// Base URL for the FastAPI backend — change port if you run uvicorn elsewhere
const API_BASE = 'http://localhost:8000'

// ─── Circular Progress Bar ─────────────────────────────────────────────────────
function CircularProgress({ value }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const strokeColor =
    value >= 80 ? '#22c55e'
    : value >= 60 ? '#f59e0b'
    : '#ef4444'

  const label =
    value >= 80 ? 'Excellent'
    : value >= 60 ? 'Good'
    : 'Needs Work'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
          {/* Background track */}
          <circle
            cx="60" cy="60" r={radius}
            className="fill-none stroke-slate-100"
            strokeWidth="10"
          />
          {/* Animated progress arc */}
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />
        </svg>
        {/* Centered percentage label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-extrabold text-slate-800 leading-none"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            {value}%
          </motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1">
            MATCH
          </span>
        </div>
      </div>
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: `${strokeColor}18`, color: strokeColor }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Feedback Card ─────────────────────────────────────────────────────────────
const cardThemes = {
  green:  { card: 'border-emerald-100',  iconBg: 'bg-emerald-100 text-emerald-600',  dot: 'bg-emerald-400' },
  red:    { card: 'border-rose-100',     iconBg: 'bg-rose-100 text-rose-600',        dot: 'bg-rose-400'    },
  indigo: { card: 'border-indigo-100',   iconBg: 'bg-indigo-100 text-indigo-600',    dot: 'bg-indigo-400'  },
}

function FeedbackCard({ icon, title, items, color, delay = 0 }) {
  const theme = cardThemes[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`bg-white rounded-2xl border ${theme.card} shadow-sm p-5 flex flex-col gap-4`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <span className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

// ─── Skill Pill ────────────────────────────────────────────────────────────────
function SkillPill({ label, found }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        found
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200'
      }`}
    >
      {found
        ? <CheckCircle2 size={11} className="flex-shrink-0" />
        : <X size={11} className="flex-shrink-0" />
      }
      {label}
    </span>
  )
}

// ─── Results Dashboard ─────────────────────────────────────────────────────────
function ResultsDashboard({ data }) {
  const { score, strengths, missingKeywords, tips, foundSkills, requiredSkills } = data

  const matchMessage =
    score >= 80
      ? 'Your resume is strongly aligned. A few tweaks could make it perfect.'
      : score >= 60
      ? 'Good profile fit — incorporating the missing keywords can significantly boost your score.'
      : 'Significant gaps detected. Tailor your resume closely before applying.'

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-10 space-y-6"
      aria-label="Analysis results"
    >
      {/* ── Score summary card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-8"
      >
        <CircularProgress value={score} />
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {score >= 80 ? '🎉 Excellent Match!' : score >= 60 ? '👍 Good Potential' : '⚠️ Needs Tailoring'}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md">
            {matchMessage}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 justify-center sm:justify-start">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              {foundSkills.length} skills matched
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              {requiredSkills.length} skills missing
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Three feedback cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeedbackCard
          icon={<Star size={16} />}
          title="Strengths"
          items={strengths}
          color="green"
          delay={0.1}
        />
        <FeedbackCard
          icon={<AlertCircle size={16} />}
          title="Missing Keywords"
          items={missingKeywords}
          color="red"
          delay={0.2}
        />
        <FeedbackCard
          icon={<Lightbulb size={16} />}
          title="Improvement Tips"
          items={tips}
          color="indigo"
          delay={0.3}
        />
      </div>

      {/* ── Skill gap analysis ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Skill Gap Analysis</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Skills detected in the job description — green = present in your resume, red = missing.
        </p>
        <div className="flex flex-wrap gap-2">
          {foundSkills.map(s => <SkillPill key={s} label={s} found />)}
          {requiredSkills.map(s => <SkillPill key={s} label={s} found={false} />)}
        </div>
      </motion.div>
    </motion.section>
  )
}

// ─── File Dropzone ─────────────────────────────────────────────────────────────
function FileDropzone({ file, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }, [onFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  return (
    <div className="flex flex-col h-full">
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        <span className="flex items-center gap-2">
          <FileText size={15} className="text-indigo-500" />
          Upload Resume
        </span>
      </label>

      <AnimatePresence mode="wait">
        {/* Success state */}
        {file ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800 truncate">{file.name}</p>
                <p className="text-xs text-emerald-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB · Ready for analysis
                </p>
              </div>
              <button
                onClick={() => onFile(null)}
                className="text-emerald-400 hover:text-emerald-700 transition-colors p-1 rounded-lg hover:bg-emerald-100"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">
              File looks good! Now paste the job description →
            </p>
          </motion.div>
        ) : (
          /* Drop zone */
          <motion.button
            key="dropzone"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex-1 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-all cursor-pointer py-12 ${
              dragging
                ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              dragging ? 'bg-indigo-200' : 'bg-indigo-100'
            }`}>
              <Upload size={24} className="text-indigo-500" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-slate-700">
                {dragging ? 'Drop it here!' : <>Drop your resume or <span className="text-indigo-600 font-semibold">browse</span></>}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF or DOCX · up to 10 MB</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={(e) => onFile(e.target.files[0] ?? null)}
        aria-label="Resume file upload"
      />
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">ResumeMatch</span>
          <span className="hidden sm:inline-flex items-center bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 ml-1">
            AI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <a
            href="#how-it-works"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 hidden sm:flex items-center gap-1"
          >
            How it Works
            <ChevronRight size={14} />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
            aria-label="View on GitHub"
          >
            <Github size={20} />
          </a>
        </nav>
      </div>
    </header>
  )
}

// ─── How It Works Section ──────────────────────────────────────────────────────
const HOW_IT_WORKS_STEPS = [
  {
    icon: <Upload size={22} />,
    title: 'Upload Your Resume',
    desc: 'Drop your PDF or DOCX resume into the upload zone. We never store your file.',
  },
  {
    icon: <FileText size={22} />,
    title: 'Paste the Job Description',
    desc: 'Copy and paste the complete job posting into the text area on the right.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Get Instant AI Feedback',
    desc: 'Receive a detailed match score, keyword analysis, and actionable tips in seconds.',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 border-y border-slate-100 py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-800">How It Works</h2>
          <p className="text-slate-500 text-sm mt-2">Three steps to a tailored, job-ready resume.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-6 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-slate-200" />

          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center text-indigo-600 relative z-10">
                {step.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Step {i + 1}
              </span>
              <h3 className="font-semibold text-slate-800 text-sm">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-semibold text-slate-200">ResumeMatch</span>
            <span className="text-slate-600 ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors text-xs">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors text-xs">Terms of Service</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors text-xs flex items-center gap-1.5"
            >
              <Github size={13} /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)   // holds backend/network error message

  const canAnalyze = file !== null && jobDescription.trim().length >= 50

  /**
   * Send the resume PDF + job description to the FastAPI /analyze endpoint
   * via multipart/form-data.  Updates UI state with the structured JSON response.
   */
  const handleAnalyze = async () => {
    if (!canAnalyze || loading) return
    setLoading(true)
    setResults(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('resume', file)                        // UploadFile
      formData.append('job_description', jobDescription)    // Form field

      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
        // No Content-Type header — the browser sets multipart boundary automatically
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          err.detail ||
          `Server returned ${response.status}. Check that the backend is running.`
        )
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      // Network failure (backend not running) or HTTP error from FastAPI
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(
          'Cannot reach the backend. Make sure FastAPI is running on ' +
          'http://localhost:8000 (run: uvicorn main:app --reload in /backend).'
        )
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setJobDescription('')
    setResults(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <Header />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-indigo-100 mb-6 shadow-sm">
              <Zap size={12} className="flex-shrink-0" />
              AI-Powered · Instant Analysis · 100% Free
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-5">
              Master Your Next<br />
              <span className="text-indigo-600">Job Application</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
              Upload your resume, paste a job description, and get an AI-powered
              compatibility score with actionable feedback — in seconds.
            </p>
          </motion.div>
        </div>
      </section>

      <HowItWorks />

      {/* ── Analyzer work area ── */}
      <section className="py-16 px-4 sm:px-6" aria-label="Resume analyzer">
        <div className="max-w-6xl mx-auto">

          {/* Section heading */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">Analyze Your Resume</h2>
            <p className="text-sm text-slate-500 mt-1">Both fields required. Job description must be at least 50 characters.</p>
          </div>

          {/* Input columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left — File upload */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[240px]">
              <FileDropzone file={file} onFile={setFile} />
            </div>

            {/* Right — Job description textarea */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <label htmlFor="jd-input" className="block text-sm font-semibold text-slate-700 mb-3">
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-indigo-500" />
                  Job Description
                </span>
              </label>
              <textarea
                id="jd-input"
                className="flex-1 min-h-[180px] w-full p-3.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all placeholder-slate-400 leading-relaxed"
                placeholder="Paste the full job posting here — include responsibilities, requirements, and preferred qualifications for the most accurate analysis…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2 flex justify-between">
                <span>{jobDescription.length} characters</span>
                {jobDescription.length > 0 && jobDescription.length < 50 && (
                  <span className="text-amber-500">{50 - jobDescription.length} more characters needed</span>
                )}
                {jobDescription.length >= 50 && (
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={11} /> Ready</span>
                )}
              </p>
            </div>
          </div>

          {/* ── Error banner ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-5 flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"
                role="alert"
              >
                <WifiOff size={18} className="flex-shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1">
                  <p className="font-semibold mb-0.5">Analysis failed</p>
                  <p className="text-rose-600 leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-700 transition-colors p-1"
                  aria-label="Dismiss error"
                >
                  <X size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyze / Reset buttons */}
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <motion.button
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              whileHover={{ scale: canAnalyze && !loading ? 1.03 : 1 }}
              whileTap={{ scale: canAnalyze && !loading ? 0.97 : 1 }}
              className={`inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md select-none ${
                canAnalyze && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  AI is analyzing — this may take ~30 s…
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Analyze Match
                </>
              )}
            </motion.button>

            {/* Show reset when results are shown OR after an error */}
            {(results || error) && !loading && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all font-medium cursor-pointer"
              >
                <X size={15} /> Start Over
              </motion.button>
            )}
          </div>

          {/* Results dashboard (conditionally rendered with animation) */}
          <AnimatePresence>
            {results && !loading && <ResultsDashboard key="results" data={results} />}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  )
}
