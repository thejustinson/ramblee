"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Sparkles, AlertCircle, FileText, PenLine, Upload, X } from "lucide-react";
import Link from "next/link";
import { createGame } from "./actions";

export default function CreateGamePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState("Mode B");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [generationMode, setGenerationMode] = useState<"from_text" | "guided">("from_text");
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [difficultyLevel, setDifficultyLevel] = useState("mixed");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("game_mode", gameMode);
      formData.set("generation_mode", generationMode);
      formData.set("question_count", questionCount.toString());
      formData.set("time_per_question", timePerQuestion.toString());
      formData.set("difficulty_level", difficultyLevel);
      formData.set("input_mode", inputMode);
      if (uploadedFile) formData.set("document", uploadedFile);
      await createGame(formData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col p-6 md:p-12 text-brand-white">
      <div className="max-w-3xl w-full mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-white transition-colors mb-10 font-mono text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </Link>
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Create New Game</h1>
        <p className="text-brand-muted mb-10 text-lg">Configure your quiz and let AI generate the questions.</p>

        {error && (
          <div className="mb-8 p-4 bg-status-wrong/10 border border-status-wrong rounded-[2px] flex items-start gap-3 text-status-wrong text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /><p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-brand-surface border border-brand-border p-8 rounded-[2px] shadow-2xl">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-brand-muted mb-2 uppercase tracking-wide font-mono">Game Title</label>
            <input id="title" name="title" type="text" placeholder="e.g. Sunday Service Youth Cup" required
              className="w-full bg-brand-black border border-brand-border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime transition-colors text-lg" />
          </div>

          {/* Game Mode */}
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-4 uppercase tracking-wide font-mono">Game Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["Mode A", "Mode B"] as const).map((m) => (
                <div key={m} onClick={() => setGameMode(m)}
                  className={`p-6 border rounded-[2px] cursor-pointer transition-all ${gameMode === m ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white bg-brand-black"}`}>
                  <h3 className={`font-display text-xl font-bold mb-2 ${gameMode === m ? "text-brand-lime" : "text-brand-white"}`}>{m}</h3>
                  <p className="text-sm text-brand-muted">{m === "Mode A" ? "Open Elimination. Players are eliminated round by round." : "Standard Quiz. Everyone plays all questions."}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Input Mode toggle */}
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-4 uppercase tracking-wide font-mono">Content Source</label>
            <div className="flex gap-2 border border-brand-border rounded-[2px] p-1 bg-brand-black mb-4">
              <button type="button" onClick={() => setInputMode("text")}
                className={`flex-1 py-2 px-4 rounded-[2px] flex items-center justify-center gap-2 text-sm font-medium transition-all ${inputMode === "text" ? "bg-brand-surface text-brand-white" : "text-brand-muted hover:text-brand-white"}`}>
                <PenLine className="w-4 h-4" />Write Topic / Notes
              </button>
              <button type="button" onClick={() => setInputMode("file")}
                className={`flex-1 py-2 px-4 rounded-[2px] flex items-center justify-center gap-2 text-sm font-medium transition-all ${inputMode === "file" ? "bg-brand-surface text-brand-white" : "text-brand-muted hover:text-brand-white"}`}>
                <FileText className="w-4 h-4" />Upload Document
              </button>
            </div>

            {inputMode === "text" ? (
              <textarea id="topic" name="topic" rows={5} required={inputMode === "text"}
                placeholder="Paste your sermon notes, syllabus, or type a topic like 'The History of Rome'..."
                className="w-full bg-brand-black border border-brand-border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime transition-colors resize-none" />
            ) : (
              <div onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2px] p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${uploadedFile ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white"}`}>
                <input ref={fileInputRef} type="file" accept=".txt,.pdf" onChange={handleFileChange} className="hidden" />
                {uploadedFile ? (
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-brand-lime" />
                    <div><p className="font-medium">{uploadedFile.name}</p><p className="text-sm text-brand-muted">{(uploadedFile.size / 1024).toFixed(1)} KB</p></div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="ml-4 text-brand-muted hover:text-status-wrong transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <><Upload className="w-10 h-10 text-brand-muted mb-3" /><p className="text-brand-white font-medium mb-1">Click to upload</p><p className="text-brand-muted text-sm">Supports .txt and .pdf files</p></>
                )}
              </div>
            )}
          </div>

          {/* Generation Mode */}
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-4 uppercase tracking-wide font-mono">Question Style</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div onClick={() => setGenerationMode("from_text")}
                className={`p-5 border rounded-[2px] cursor-pointer transition-all ${generationMode === "from_text" ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white"}`}>
                <h4 className={`font-semibold mb-1 ${generationMode === "from_text" ? "text-brand-lime" : "text-brand-white"}`}>Strictly from content</h4>
                <p className="text-sm text-brand-muted">Questions drawn directly from your notes. Best for revision quizzes.</p>
              </div>
              <div onClick={() => setGenerationMode("guided")}
                className={`p-5 border rounded-[2px] cursor-pointer transition-all ${generationMode === "guided" ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white"}`}>
                <h4 className={`font-semibold mb-1 ${generationMode === "guided" ? "text-brand-lime" : "text-brand-white"}`}>Topic-guided (broader)</h4>
                <p className="text-sm text-brand-muted">AI uses your content as a guide but draws on general knowledge too.</p>
              </div>
            </div>
          </div>

          {/* Time Per Question */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-brand-muted uppercase tracking-wide font-mono">Time Per Question</label>
              <span className="font-display font-bold text-brand-lime text-2xl">{timePerQuestion}s</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[15, 20, 30, 45, 60].map((t) => (
                <button key={t} type="button" onClick={() => setTimePerQuestion(t)}
                  className={`py-3 rounded-[2px] font-mono font-bold text-sm transition-all border ${
                    timePerQuestion === t ? "bg-brand-lime text-brand-black border-brand-lime" : "border-brand-border text-brand-muted hover:border-brand-white hover:text-brand-white"
                  }`}>{t}s</button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-4 uppercase tracking-wide font-mono">Difficulty</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["easy", "intermediate", "hard", "mixed"] as const).map((d) => (
                <div key={d} onClick={() => setDifficultyLevel(d)}
                  className={`p-4 border rounded-[2px] cursor-pointer transition-all text-center ${
                    difficultyLevel === d ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white"
                  }`}>
                  <div className={`font-semibold capitalize text-sm ${
                    difficultyLevel === d ? "text-brand-lime" : "text-brand-white"
                  }`}>{d === "mixed" ? "🎲 Mixed" : d === "easy" ? "🟢 Easy" : d === "intermediate" ? "🟡 Intermediate" : "🔴 Hard"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-brand-muted uppercase tracking-wide font-mono">Number of Questions</label>
              <span className="font-display font-bold text-brand-lime text-3xl">{questionCount}</span>
            </div>
            <input type="range" min={10} max={20} step={1} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-brand-lime cursor-pointer" />
            <div className="flex justify-between font-mono text-brand-muted text-xs mt-1"><span>10</span><span>20</span></div>
          </div>

          {/* Reward */}
          <div>
            <label htmlFor="reward" className="block text-sm font-medium text-brand-muted mb-2 uppercase tracking-wide font-mono">
              Prize / Reward <span className="normal-case text-xs">(optional)</span>
            </label>
            <input id="reward" name="reward" type="text" placeholder="e.g. ₦5,000 airtime for the winner"
              className="w-full bg-brand-black border border-brand-border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime transition-colors" />
          </div>

          <button type="submit" disabled={loading || (inputMode === "file" && !uploadedFile)}
            className="w-full py-5 px-6 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(200,255,0,0.15)]">
            {loading ? (
              <><div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin" /><span>AI is generating {questionCount} questions...</span></>
            ) : (
              <><Sparkles className="w-5 h-5" />Generate {questionCount} Questions</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
