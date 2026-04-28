"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, CheckCircle2, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

// Helper for staggered text
const StaggeredText = ({ text }: { text: string }) => {
  const words = text.split(" ");
  return (
    <span className="inline-block">
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: idx * 0.06,
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

// Section helper
const Section = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.section
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className={`py-24 px-6 md:px-12 max-w-7xl mx-auto w-full ${className}`}
  >
    {children}
  </motion.section>
);

const QUIZ_QUESTIONS = [
  {
    question: "Which of these countries does NOT share a land border with Brazil?",
    options: [
      { label: "A", text: "Argentina" },
      { label: "B", text: "Chile" },
      { label: "C", text: "Venezuela" },
      { label: "D", text: "Peru" }
    ],
    correct: "B"
  },
  {
    question: "Who was the first Emperor of Rome?",
    options: [
      { label: "A", text: "Julius Caesar" },
      { label: "B", text: "Nero" },
      { label: "C", text: "Augustus" },
      { label: "D", text: "Caligula" }
    ],
    correct: "C"
  },
  {
    question: 'In "The Matrix", which pill does Neo take to wake up from the simulation?',
    options: [
      { label: "A", text: "The Blue Pill" },
      { label: "B", text: "The Green Pill" },
      { label: "C", text: "The Red Pill" },
      { label: "D", text: "The Yellow Pill" }
    ],
    correct: "C"
  },
  {
    question: 'Which author wrote the dystopian novel "1984"?',
    options: [
      { label: "A", text: "Aldous Huxley" },
      { label: "B", text: "George Orwell" },
      { label: "C", text: "Ray Bradbury" },
      { label: "D", text: "Philip K. Dick" }
    ],
    correct: "B"
  },
  {
    question: "What is the largest moon in our solar system?",
    options: [
      { label: "A", text: "Titan" },
      { label: "B", text: "Europa" },
      { label: "C", text: "Ganymede" },
      { label: "D", text: "Earth's Moon" }
    ],
    correct: "C"
  },
  {
    question: "In Norse mythology, what is the name of the squirrel that runs up and down the world tree?",
    options: [
      { label: "A", text: "Ratatoskr" },
      { label: "B", text: "Fenrir" },
      { label: "C", text: "Jörmungandr" },
      { label: "D", text: "Sleipnir" }
    ],
    correct: "A"
  },
  {
    question: "What does the 'P' in 'HTTP' stand for?",
    options: [
      { label: "A", text: "Program" },
      { label: "B", text: "Protocol" },
      { label: "C", text: "Process" },
      { label: "D", text: "Platform" }
    ],
    correct: "B"
  },
  {
    question: "What is the most abundant gas in the Earth's atmosphere?",
    options: [
      { label: "A", text: "Oxygen" },
      { label: "B", text: "Carbon Dioxide" },
      { label: "C", text: "Nitrogen" },
      { label: "D", text: "Hydrogen" }
    ],
    correct: "C"
  },
  {
    question: "Which artist famously cut off part of his own left ear?",
    options: [
      { label: "A", text: "Pablo Picasso" },
      { label: "B", text: "Claude Monet" },
      { label: "C", text: "Salvador Dalí" },
      { label: "D", text: "Vincent van Gogh" }
    ],
    correct: "D"
  },
  {
    question: "What is the primary function of mitochondria in a cell?",
    options: [
      { label: "A", text: "Protein synthesis" },
      { label: "B", text: "Energy production (ATP)" },
      { label: "C", text: "Waste removal" },
      { label: "D", text: "DNA storage" }
    ],
    correct: "B"
  }
];

type QuizQuestion = typeof QUIZ_QUESTIONS[0];

function InteractiveQuiz() {
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameState, setGameState] = useState<"playing" | "answered" | "finished">("playing");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const startNewGame = () => {
    const shuffledQ = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
    const fullyShuffled = shuffledQ.map(q => {
      const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
      const optionsWithNewLabels = shuffledOpts.map((opt, idx) => ({
        ...opt,
        originalLabel: opt.label,
        label: ["A", "B", "C", "D"][idx]
      }));
      
      const correctOpt = optionsWithNewLabels.find(o => o.originalLabel === q.correct);
      
      return {
        ...q,
        options: optionsWithNewLabels,
        correct: correctOpt ? correctOpt.label : q.correct
      };
    });
    
    setShuffledQuestions(fullyShuffled);
    setCurrentIdx(0);
    setScore(0);
    setTimeLeft(10);
    setGameState("playing");
    setSelectedAnswer(null);
  };

  useEffect(() => {
    setIsMounted(true);
    startNewGame();
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || !isMounted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState, currentIdx, isMounted]);

  const handleTimeOut = () => {
    setGameState("answered");
    setTimeout(nextQuestion, 2000);
  };

  const handleSelect = (label: string) => {
    if (gameState !== "playing") return;
    
    setSelectedAnswer(label);
    setGameState("answered");
    
    if (label === shuffledQuestions[currentIdx].correct) {
      setScore((s) => s + 1);
    }
    
    setTimeout(nextQuestion, 2000);
  };

  const nextQuestion = () => {
    if (currentIdx < shuffledQuestions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setTimeLeft(10);
      setGameState("playing");
      setSelectedAnswer(null);
    } else {
      setGameState("finished");
    }
  };

  if (!isMounted || shuffledQuestions.length === 0) {
    return (
      <div className="w-full max-w-4xl bg-brand-surface border border-brand-border rounded-[4px] relative shadow-2xl overflow-hidden aspect-[4/3] md:aspect-[16/9] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-lime border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="w-full max-w-4xl bg-brand-surface border border-brand-border rounded-[4px] p-8 md:p-12 relative shadow-2xl flex flex-col items-center justify-center aspect-[4/3] md:aspect-[16/9]">
        <h3 className="font-display text-4xl md:text-6xl font-bold mb-4">Quiz Complete!</h3>
        <p className="text-xl text-brand-muted mb-8 font-mono">Score: {score} / {shuffledQuestions.length}</p>
        <button 
          onClick={startNewGame}
          className="px-8 py-4 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Play Again
        </button>
      </div>
    );
  }

  const question = shuffledQuestions[currentIdx];

  return (
    <div className="w-full max-w-4xl bg-brand-surface border border-brand-border rounded-[4px] relative shadow-2xl overflow-hidden aspect-[4/3] md:aspect-[16/9] flex flex-col">
      {/* Timer Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-border z-10">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${timeLeft < 3 ? 'bg-status-wrong' : 'bg-status-timer'}`}
          style={{ width: `${(timeLeft / 10) * 100}%` }}
        />
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto quiz-scrollbar p-8 md:p-12 flex flex-col pt-10 md:pt-14">
        {/* Header info */}
        <div className="flex justify-between items-start mb-auto shrink-0">
          <div className="font-mono text-sm text-brand-muted">Q. {currentIdx + 1}/{shuffledQuestions.length}</div>
          <div className="flex items-center gap-6">
            <div className="font-mono text-sm text-brand-lime">Score: {score}</div>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-4 h-4 text-brand-muted" />
              <span className="font-mono text-sm text-brand-white">128</span>
            </div>
          </div>
        </div>
        
        {/* Question */}
        <div className="text-center my-8 md:my-12 shrink-0">
          <motion.h3 
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-5xl font-semibold leading-tight max-w-3xl mx-auto"
          >
            {question.question}
          </motion.h3>
        </div>
        
        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto shrink-0">
        {question.options.map((opt, i) => {
          let cardClass = "bg-brand-card border border-brand-border hover:border-brand-white cursor-pointer";
          let labelClass = "text-brand-muted border-brand-border";
          
          if (gameState === "answered") {
            if (opt.label === question.correct) {
              cardClass = "bg-status-correct/10 border-status-correct cursor-default";
              labelClass = "text-status-correct border-status-correct";
            } else if (opt.label === selectedAnswer) {
              cardClass = "bg-status-wrong/10 border-status-wrong cursor-default";
              labelClass = "text-status-wrong border-status-wrong";
            } else {
              cardClass = "bg-brand-card border-brand-border opacity-50 cursor-default";
            }
          }
          
          return (
            <div 
              key={i} 
              onClick={() => handleSelect(opt.label)}
              className={`${cardClass} p-4 md:p-6 flex items-center gap-4 rounded-[2px] transition-colors`}
            >
              <div className={`w-8 h-8 flex items-center justify-center border rounded-[2px] font-mono text-sm ${labelClass}`}>
                {opt.label}
              </div>
              <span className="font-medium text-lg">{opt.text}</span>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-brand-black text-brand-white selection:bg-brand-lime selection:text-brand-black overflow-x-hidden">
      {/* 1. Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 transition-colors duration-300 ${
          scrolled ? "bg-brand-black border-b border-brand-border" : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="font-display font-bold text-xl tracking-wider uppercase">Ramblee</div>
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm text-brand-muted hover:text-brand-white transition-colors">
                Dashboard
              </Link>
              <Link
                href="/create"
                className="px-4 py-2 bg-brand-lime text-brand-black font-medium text-sm hover:brightness-110 transition-all rounded-[2px]"
              >
                Create Game
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-brand-muted hover:text-brand-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-brand-lime text-brand-black font-medium text-sm hover:brightness-110 transition-all rounded-[2px]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* 2. Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 overflow-hidden">
        {/* Subtle dot grid bg */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ backgroundImage: "radial-gradient(#C8FF00 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        
        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight mb-6">
            <div className="block"><StaggeredText text="Play fast." /></div>
            <div className="block"><StaggeredText text="Think faster." /></div>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-brand-muted text-lg md:text-xl max-w-2xl mb-10"
          >
            The real-time, multiplayer quiz platform designed for physical and virtual spaces. From crowd to champion in minutes.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-16"
          >
            <Link href="/create" className="w-full sm:w-auto px-8 py-4 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              Start a Game
            </Link>
            <Link href="/join" className="w-full sm:w-auto px-8 py-4 border border-brand-white text-brand-white font-semibold rounded-[2px] hover:bg-brand-surface transition-colors flex items-center justify-center gap-2">
              Join a Room
            </Link>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="font-mono text-xs md:text-sm text-brand-muted tracking-widest uppercase flex flex-wrap justify-center gap-4 md:gap-8"
          >
            <span>1,200+ games played</span>
            <span className="hidden sm:inline">·</span>
            <span>40,000+ questions</span>
            <span className="hidden sm:inline">·</span>
            <span>0 boring rooms</span>
          </motion.div>
        </div>
      </section>

      {/* 3. How it Works */}
      <Section className="border-t border-brand-border/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: "01", title: "Upload Notes", desc: "Upload your PDFs, documents, or plain text. Our AI generates your question set in seconds." },
            { step: "02", title: "Share Code", desc: "Project the room code. Your crowd joins instantly via phone browser—no download required." },
            { step: "03", title: "Play Live", desc: "Questions sync across screens. The fastest correct answer wins the most points." },
          ].map((item, i) => (
            <div key={i} className="group flex flex-col gap-4 border-l-2 border-brand-border hover:border-brand-lime transition-colors pl-6 py-2">
              <div className="font-mono text-brand-muted text-sm group-hover:text-brand-lime transition-colors">{item.step}</div>
              <h3 className="font-display text-2xl font-semibold">{item.title}</h3>
              <p className="text-brand-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Game Modes */}
      <Section>
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Choose your arena</h2>
          <p className="text-brand-muted text-lg max-w-xl mx-auto">Two distinct ways to play, depending on your audience and stakes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Mode A */}
          <div className="bg-brand-card border border-brand-border hover:border-[#444444] transition-colors p-8 rounded-[2px] relative overflow-hidden group">
            <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(200,255,0,0.03)] group-hover:shadow-[inset_0_0_60px_rgba(200,255,0,0.06)] transition-shadow" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-lime/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <h3 className="font-display text-3xl font-bold mb-4 flex items-center gap-3">
              Mode A <span className="text-brand-lime text-xl font-normal tracking-wide">— Open Elimination</span>
            </h3>
            <p className="text-brand-muted text-lg mb-8 leading-relaxed">
              Start with the whole crowd. Eliminate players round by round until only the top finalists remain for a high-stakes head-to-head on the main stage.
            </p>
            <div className="font-mono text-xs text-brand-lime uppercase tracking-widest bg-brand-lime/10 inline-block px-3 py-1 rounded-[2px]">
              best for — large events
            </div>
          </div>
          
          {/* Mode B */}
          <div className="bg-brand-card border border-brand-border hover:border-[#444444] transition-colors p-8 rounded-[2px] flex flex-col justify-between">
            <div>
              <h3 className="font-display text-3xl font-bold mb-4">Mode B <span className="text-brand-muted text-xl font-normal">— Standard Quiz</span></h3>
              <p className="text-brand-muted text-lg mb-8 leading-relaxed">
                Everyone plays through every question. Points accumulate based on speed and accuracy. The classic leaderboard experience, refined.
              </p>
            </div>
            <div className="font-mono text-xs text-brand-muted uppercase tracking-widest bg-brand-surface inline-block px-3 py-1 rounded-[2px] self-start">
              best for — classrooms & teams
            </div>
          </div>
        </div>
      </Section>

      {/* 5. The Screen Experience */}
      <Section className="py-32">
        <div className="flex flex-col items-center">
          <h2 className="font-display text-4xl font-bold mb-12 text-center">The Screen Experience</h2>
          
          {/* Mock Game Card */}
          <InteractiveQuiz />
        </div>
      </Section>

      {/* 6. AI Question Generation */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">Instantly turn notes into matches.</h2>
            <p className="text-brand-muted text-lg mb-8 leading-relaxed">
              Don't waste hours writing questions. Upload your sermon notes, classroom slides, or meeting agendas. Our AI engines chunk the text and generate perfectly balanced question sets in seconds.
            </p>
            <ul className="space-y-4">
              {["Supports PDF, DOCX, and raw text", "Customizable difficulty distribution", "Review and edit before going live"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-brand-white">
                  <CheckCircle2 className="w-5 h-5 text-brand-lime shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Terminal Mockup */}
          <div className="bg-[#050505] border border-brand-border rounded-[4px] p-6 font-mono text-sm leading-loose overflow-x-auto shadow-xl">
            <div className="flex gap-2 mb-4 border-b border-brand-border/50 pb-4">
              <div className="w-3 h-3 rounded-full bg-[#333]"></div>
              <div className="w-3 h-3 rounded-full bg-[#333]"></div>
              <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            </div>
            <pre>
<span className="text-brand-lime">"question"</span>: <span className="text-brand-white">"What initiates the Calvin cycle?"</span>,
<span className="text-brand-lime">"difficulty"</span>: <span className="text-brand-white">"Hard"</span>,
<span className="text-brand-lime">"options"</span>: [
  <span className="text-brand-white">"A) Light absorption by chlorophyll"</span>,
  <span className="text-brand-white">"B) Carbon fixation by RuBisCO"</span>,
  <span className="text-brand-white">"C) Reduction of 3-PGA"</span>,
  <span className="text-brand-white">"D) Regeneration of RuBP"</span>
],
<span className="text-brand-lime">"correct_answer"</span>: <span className="text-brand-white">"B"</span>,
<span className="text-brand-lime">"source_reference"</span>: <span className="text-brand-white">"Chapter_4_Photosynthesis.pdf"</span>
            </pre>
          </div>
        </div>
      </Section>

      {/* 7. Social + History */}
      <Section className="py-24 border-t border-brand-border/50">
        <div className="flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-6 mb-12 w-full max-w-4xl">
            {[
              { name: "@justin", games: 42, win: "68%", acc: "91%" },
              { name: "@sarah_k", games: 15, win: "40%", acc: "82%" },
              { name: "@the_builder", games: 89, win: "85%", acc: "96%" }
            ].map((player, i) => (
              <div key={i} className="bg-brand-card border border-brand-border p-6 rounded-[2px] w-full max-w-[280px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-brand-surface border border-brand-border rounded-[2px] flex items-center justify-center">
                    <User className="w-5 h-5 text-brand-muted" />
                  </div>
                  <span className="font-mono font-medium text-brand-white">{player.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-brand-muted text-xs font-mono mb-1 uppercase tracking-wider">Games</div>
                    <div className="font-display font-semibold text-xl">{player.games}</div>
                  </div>
                  <div>
                    <div className="text-brand-muted text-xs font-mono mb-1 uppercase tracking-wider">Win Rate</div>
                    <div className="font-display font-semibold text-xl">{player.win}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xl text-brand-white text-center">Find players. Follow rivals. Track your record.</p>
        </div>
      </Section>

      {/* 8. CTA Banner */}
      <section className="py-32 px-6 bg-brand-surface border-y border-brand-border text-center flex flex-col items-center">
        <h2 className="font-display text-5xl md:text-6xl font-bold mb-10 max-w-2xl mx-auto">Ready to run the room?</h2>
        <Link href="/create" className="inline-block px-10 py-5 bg-brand-lime text-brand-black font-semibold text-lg hover:brightness-110 transition-all rounded-[2px] mb-6">
          Create Your First Game
        </Link>
        <p className="text-brand-muted">Free to start. No download required.</p>
      </section>

      {/* 9. Footer */}
      <footer className="py-12 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-display font-bold tracking-wider uppercase text-lg">Ramblee</div>
        <div className="flex items-center gap-6 text-sm text-brand-muted">
          <Link href="/product" className="hover:text-brand-white transition-colors">Product</Link>
          <Link href="/docs" className="hover:text-brand-white transition-colors">Docs</Link>
          <Link href="/about" className="hover:text-brand-white transition-colors">About</Link>
          <Link href="/contact" className="hover:text-brand-white transition-colors">Contact</Link>
        </div>
        <div className="text-sm text-brand-muted text-center md:text-right">
          Built for the room. <br className="md:hidden" />© Ramblee 2026.
        </div>
      </footer>
    </div>
  );
}

// Small icon helper since we don't have a specific Users one imported above
function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
