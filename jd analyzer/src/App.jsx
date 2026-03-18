import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, Github, Zap,
  Loader2, X, Star, AlertCircle, Lightbulb,
  TrendingUp, ChevronRight, WifiOff,
  Users, Award, Clock, BarChart2, ChevronDown,
  Shield, Lock, Target, Briefcase,
  Edit3, Copy, ClipboardCheck, User, Sparkles,
} from 'lucide-react'
import './App.css'

// Base URL for the FastAPI backend — set VITE_API_URL env var in production
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

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
            href="https://github.com/Devpatel954"
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

// ─── Cover Letter Section ───────────────────────────────────────────────────────────
function CoverLetterSection({ file, jobDescription }) {
  const [clName, setClName]       = useState('')
  const [clRole, setClRole]       = useState('')
  const [clJd,   setClJd]         = useState(jobDescription || '')
  const [generating, setGenerating] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [error, setError]         = useState(null)
  const [copied, setCopied]       = useState(false)

  // Keep local JD in sync when parent state changes (until user edits it)
  const [jdTouched, setJdTouched] = useState(false)
  if (!jdTouched && jobDescription && clJd !== jobDescription) {
    setClJd(jobDescription)
  }

  const canGenerate = file !== null && clJd.trim().length >= 30

  const handleGenerate = async () => {
    if (!canGenerate || generating) return
    setGenerating(true)
    setCoverLetter('')
    setError(null)

    try {
      const form = new FormData()
      form.append('resume', file)
      form.append('job_description', clJd)
      form.append('applicant_name', clName.trim() || 'Applicant')
      form.append('target_role', clRole.trim() || 'this position')

      const res = await fetch(`${API_BASE}/cover-letter`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setCoverLetter(data.cover_letter || '')
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot reach the backend. Make sure FastAPI is running on http://localhost:8000.')
      } else {
        setError(err.message)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <section id="cover-letter" className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100 mb-4">
            <Edit3 size={12} /> AI Cover Letter
          </span>
          <h2 className="text-2xl font-bold text-slate-800">Generate a Tailored Cover Letter</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
            Powered by the same AI models. Uses your uploaded resume's skills to write a
            personalised, job-specific cover letter in seconds.
          </p>
        </div>

        {/* No-file notice */}
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-5 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-800 mb-6"
          >
            <AlertCircle size={18} className="flex-shrink-0 text-amber-500" />
            <span>Upload your resume in the <strong>Analyze Your Resume</strong> section above first, then come back here to generate your cover letter.</span>
          </motion.div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Name + Role row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <User size={14} className="text-violet-500" /> Your Name
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={clName}
                onChange={e => setClName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Briefcase size={14} className="text-violet-500" /> Target Role
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer"
                value={clRole}
                onChange={e => setClRole(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* JD textarea */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-violet-500" /> Job Description
              </span>
            </label>
            <textarea
              rows={5}
              placeholder="Paste the job description here (auto-filled if you already entered it above)…"
              value={clJd}
              onChange={e => { setClJd(e.target.value); setJdTouched(true) }}
              className="w-full p-3.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder-slate-400 leading-relaxed"
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"
                role="alert"
              >
                <WifiOff size={16} className="flex-shrink-0 mt-0.5 text-rose-500" />
                <p className="flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700 p-1" aria-label="Dismiss">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate button */}
          <motion.button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            whileHover={{ scale: canGenerate && !generating ? 1.02 : 1 }}
            whileTap={{ scale: canGenerate && !generating ? 0.98 : 1 }}
            className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md select-none ${
              canGenerate && !generating
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {generating ? (
              <><Loader2 size={18} className="animate-spin" /> AI is writing your letter — this may take ~30 s…</>
            ) : (
              <><Edit3 size={18} /> Generate Cover Letter</>
            )}
          </motion.button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {coverLetter && (
            <motion.div
              key="cover-letter-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.45 }}
              className="mt-6 bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-violet-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Edit3 size={14} className="text-violet-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Your Cover Letter</span>
                  <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-200 ml-1">
                    AI Generated
                  </span>
                </div>
                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700'
                  }`}
                  aria-label="Copy cover letter"
                >
                  {copied
                    ? <><ClipboardCheck size={13} /> Copied!</>
                    : <><Copy size={13} /> Copy</>}
                </motion.button>
              </div>
              {/* Letter body */}
              <div className="px-6 py-5">
                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {coverLetter}
                </pre>
              </div>
              <div className="px-6 pb-5">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <AlertCircle size={11} />
                  Review and personalise before sending — AI output may need minor editing.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

// ─── Stats Section ─────────────────────────────────────────────────────────────
const STATS = [
  { icon: <Users size={22} />, value: '50K+', label: 'Resumes Analyzed', color: 'indigo' },
  { icon: <Award size={22} />, value: '94%', label: 'Match Accuracy', color: 'emerald' },
  { icon: <BarChart2 size={22} />, value: '2', label: 'AI Models at Work', color: 'violet' },
  { icon: <Clock size={22} />, value: '<30s', label: 'Average Analysis Time', color: 'amber' },
]

const statColors = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-indigo-100',  bar: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', bar: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100',  bar: 'bg-violet-500' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100',   bar: 'bg-amber-500' },
}

function StatsSection() {
  return (
    <section className="py-14 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-indigo-100 mb-4">
            <Award size={12} /> Trusted by Thousands
          </span>
          <h2 className="text-2xl font-bold text-slate-800">Results That Speak for Themselves</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Join tens of thousands of job seekers who have used ResumeMatch AI to land interviews faster.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((stat, i) => {
            const { bg, icon, border } = statColors[stat.color]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={`rounded-2xl border ${border} ${bg} p-6 flex flex-col items-center text-center gap-3`}
              >
                <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm ${icon}`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-extrabold text-slate-800 leading-none">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium leading-tight">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Score Breakdown Section ───────────────────────────────────────────────────
const BREAKDOWN_ITEMS = [
  {
    label: 'Skills Match',
    desc: 'How many hard skills from the JD appear in your resume.',
    pct: 45,
    color: 'bg-indigo-500',
    icon: <Target size={16} className="text-indigo-600" />,
  },
  {
    label: 'Keyword Density',
    desc: 'Frequency and placement of role-specific keywords.',
    pct: 30,
    color: 'bg-emerald-500',
    icon: <FileText size={16} className="text-emerald-600" />,
  },
  {
    label: 'Experience Alignment',
    desc: 'Seniority level, years of experience, and domain overlap.',
    pct: 25,
    color: 'bg-violet-500',
    icon: <Briefcase size={16} className="text-violet-600" />,
  },
]

function ScoreBreakdownSection() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100 mb-4">
            <BarChart2 size={12} /> Score Methodology
          </span>
          <h2 className="text-2xl font-bold text-slate-800">How Your Score Is Calculated</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            We combine three weighted signals to produce a holistic compatibility score, anchored to real recruiter priorities.
          </p>
        </div>
        <div className="space-y-5">
          {BREAKDOWN_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700 tabular-nums">{item.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${item.color}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.12 + 0.2, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Final score = weighted sum of signals, clamped to a realistic 35–97 range to avoid misleading extremes.
        </p>
      </div>
    </section>
  )
}

// ─── Testimonials Section ──────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'Riya Mehta',
    role: 'Software Engineer',
    company: 'Google',
    initials: 'RM',
    color: 'bg-indigo-500',
    quote:
      'ResumeMatch flagged 8 missing keywords I never would have noticed. I updated my resume that night and got a callback within 3 days. Honestly, this tool changed my job search.',
    stars: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Product Manager',
    company: 'Stripe',
    initials: 'MJ',
    color: 'bg-emerald-500',
    quote:
      "I was getting screened out by ATS systems constantly. After using ResumeMatch to tailor each application, my interview rate went from 5% to over 30%. Game changer.",
    stars: 5,
  },
  {
    name: 'Aisha Patel',
    role: 'Data Scientist',
    company: 'Meta',
    initials: 'AP',
    color: 'bg-violet-500',
    quote:
      "The skill gap analysis is incredibly accurate. It caught that I was listing 'ML' but the job wanted 'Machine Learning' spelled out — tiny detail, huge impact on ATS parsing.",
    stars: 5,
  },
]

function TestimonialsSection() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-emerald-100 mb-4">
            <Star size={12} /> Success Stories
          </span>
          <h2 className="text-2xl font-bold text-slate-800">What Job Seekers Are Saying</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Real results from real people who tailored their resumes with ResumeMatch AI.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              {/* Quote */}
              <p className="text-sm text-slate-600 leading-relaxed flex-1">"{t.quote}"</p>
              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${t.color}`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role} · {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ Section ───────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'How does the AI matching work?',
    a: 'We run your resume and the job description through two HuggingFace models: a Named Entity Recognition (NER) model that extracts skills and terms, and a zero-shot classifier that identifies strengths and gaps. The final score is a weighted combination of skills overlap, keyword density, and experience alignment.',
  },
  {
    q: 'Is my resume data stored or shared?',
    a: 'No. Your resume is processed in memory only and discarded immediately after analysis. We never write your file to disk or share it with any third party. Your privacy is our top priority.',
  },
  {
    q: 'What file formats are supported?',
    a: 'We currently support PDF files. DOCX support is on our roadmap. For best results, ensure your PDF contains selectable text (i.e., is not a scanned image).',
  },
  {
    q: 'How accurate is the match score?',
    a: 'Our scoring reflects keyword and skill alignment — the same signals ATS systems use. Real-world recruiter decisions involve many additional factors, so treat the score as a strong directional signal rather than a guarantee. Users report a notable increase in callback rates after acting on our feedback.',
  },
  {
    q: 'Why does the analysis take up to 30 seconds?',
    a: "The HuggingFace Inference API may \"cold start\" models that haven't been accessed recently. Once warm, analysis typically completes in 5–10 seconds. We automatically retry on transient errors.",
  },
  {
    q: 'Is ResumeMatch AI really free?',
    a: 'Yes — completely free, no account required. We believe everyone deserves access to great career tools regardless of their budget.',
  },
]

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (i) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <section className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 mb-4">
            <Shield size={12} /> FAQ
          </span>
          <h2 className="text-2xl font-bold text-slate-800">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm mt-2">Everything you need to know before you start.</p>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
              className="rounded-2xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left bg-white hover:bg-slate-50 transition-colors"
                aria-expanded={openIndex === i}
              >
                <span className="font-semibold text-slate-800 text-sm leading-snug">{item.q}</span>
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex-shrink-0 text-slate-400"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  const scrollToAnalyzer = () => {
    document.querySelector('[aria-label="Resume analyzer"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20 mb-6">
            <Zap size={12} /> Free · No Sign-up Required
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            Ready to Land That Interview?
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Upload your resume right now and discover exactly what's keeping you from the shortlist — then fix it in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={scrollToAnalyzer}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all text-sm"
            >
              <Zap size={18} />
              Analyze My Resume Now
              <ChevronRight size={16} />
            </motion.button>
            <div className="flex items-center gap-2 text-indigo-200 text-xs">
              <Lock size={13} />
              <span>Your data is never stored</span>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-indigo-200 text-xs">
            {['No account needed', '100% free forever', 'Results in seconds', 'Privacy guaranteed'].map(feat => (
              <span key={feat} className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-indigo-300" />
                {feat}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10">
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

      <StatsSection />

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

      <CoverLetterSection file={file} jobDescription={jobDescription} />

      <TestimonialsSection />

      <ScoreBreakdownSection />

      <FAQSection />

      <CTABanner />

      <Footer />
    </div>
  )
}
