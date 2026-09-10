'use client'

import React, { useState } from 'react'
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Building,
  Users,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'

interface ElectiveOption {
  id: string
  code: string
  title: string
  instructor: string
  room: string
  capacity: number
  enrolled: number
  description: string
  topics: string[]
}

const PE_OPTIONS: ElectiveOption[] = [
  {
    id: 'opt-cloud',
    code: 'PE501-A',
    title: 'Cloud Architecture & DevOps Engineering',
    instructor: 'Prof. M. Gupta',
    room: 'Auditorium-1',
    capacity: 65,
    enrolled: 58,
    description:
      'Containerization, Kubernetes orchestration, AWS/GCP serverless architectures, and CI/CD pipelines.',
    topics: ['Docker & K8s', 'Microservices', 'Terraform (IaC)', 'Site Reliability Eng.'],
  },
  {
    id: 'opt-sec',
    code: 'PE501-B',
    title: 'Cyber Security & Ethical Penetration Testing',
    instructor: 'Dr. S. Kulkarni',
    room: 'Lab L-SYS2',
    capacity: 40,
    enrolled: 38,
    description:
      'Network vulnerability assessment, web exploitation, cryptographic protocols, and SOC operations.',
    topics: ['OWASP Top 10', 'Wireshark & Metasploit', 'Cryptography', 'Zero-Trust Architecture'],
  },
  {
    id: 'opt-nlp',
    code: 'PE501-C',
    title: 'Natural Language Processing with Transformers',
    instructor: 'Dr. Varun Patel',
    room: 'Room R-302',
    capacity: 65,
    enrolled: 62,
    description:
      'Large Language Models, attention mechanisms, HuggingFace transformers, and vector search embeddings.',
    topics: ['BERT & GPT Architectures', 'HuggingFace Pipelines', 'RAG Systems', 'Tokenization & Vectors'],
  },
]

export default function StudentPeSelectionPage() {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-cloud')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(true)
  const [toast, setToast] = useState<string | null>(null)

  const handleConfirmSelection = () => {
    setIsSubmitted(true)
    const selected = PE_OPTIONS.find((o) => o.id === selectedOptionId)
    setToast(
      `Successfully confirmed registration for ${selected?.title}! Your timetable schedule has been updated.`
    )
    setTimeout(() => setToast(null), 5000)
  }

  const activeOption = PE_OPTIONS.find((o) => o.id === selectedOptionId)

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Program Elective (PE) Track Selection
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Student: <span className="text-indigo-300 font-semibold">Aarav Mehta</span> • Division TE-1 (Sem 5)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isSubmitted ? 'success' : 'warning'} dot>
            {isSubmitted ? 'Registration Confirmed' : 'Selection Pending'}
          </Badge>
        </div>
      </div>

      {/* Confirmation Toast */}
      {toast && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Status Notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Synchronized Elective Window (AY 2026-27)
          </span>
          <h2 className="text-base font-bold text-white tracking-tight">
            Common Time Block: Mon, Wed, Fri • 11:00 AM - 12:00 PM
          </h2>
          <p className="text-xs text-slate-400">
            Choose exactly one track. Your chosen track automatically populates into your weekly division timetable.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">3 Tracks Available</div>
            <div className="text-[11px] text-slate-400">Limited Capacity</div>
          </div>
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedOptionId}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitted ? 'Update Registration' : 'Confirm Elective Choice'}
          </button>
        </div>
      </div>

      {/* Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PE_OPTIONS.map((opt) => {
          const isSelected = selectedOptionId === opt.id
          const seatsRemaining = opt.capacity - opt.enrolled
          const isFull = seatsRemaining <= 0
          return (
            <div
              key={opt.id}
              onClick={() => !isFull && setSelectedOptionId(opt.id)}
              className={`rounded-2xl border p-5 shadow-xl transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    {opt.code}
                  </span>
                  <Badge variant={seatsRemaining <= 3 ? 'danger' : 'purple'}>
                    {seatsRemaining} Seats Left
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {opt.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Instructor: <strong className="text-white">{opt.instructor}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>Allocated Venue: <strong className="text-white">{opt.room}</strong></span>
                  </div>
                </div>

                {/* Syllabus Highlights */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Syllabus Modules
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {opt.topics.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-400">Quota: </span>
                  <span className="text-white font-medium">
                    {opt.enrolled} / {opt.capacity}
                  </span>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
