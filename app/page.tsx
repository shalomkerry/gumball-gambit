"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Pause, Play, RotateCcw } from "lucide-react"

// Sound utilities using Web Audio API
let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume()
  }
  return audioCtx
}

function playCorrectSound() {
  const ctx = getAudioContext()
  const duration = 1

  // White noise buffer for spray effect
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1)
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  // Bandpass filter to shape the spray hiss
  const filter = ctx.createBiquadFilter()
  filter.type = "highpass"
  filter.frequency.setValueAtTime(10000, ctx.currentTime)
  filter.Q.setValueAtTime(2, ctx.currentTime)

  // Highpass to remove low rumble
  const hipass = ctx.createBiquadFilter()
  hipass.type = "lowpass"
  hipass.frequency.setValueAtTime(1000, ctx.currentTime)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(2, ctx.currentTime + 0.02)
  gain.gain.setValueAtTime(2, ctx.currentTime + 0.08)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  noise.connect(filter)
  filter.connect(hipass)
  hipass.connect(gain)
  gain.connect(ctx.destination)

  noise.start(ctx.currentTime)
  noise.stop(ctx.currentTime + duration)
}

function playWrongSound() {
  const ctx = getAudioContext()

  // Two detuned oscillators for a harsh buzz
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()
  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)

  osc1.type = "square"
  osc1.frequency.setValueAtTime(150, ctx.currentTime)
  osc2.type = "sawtooth"
  osc2.frequency.setValueAtTime(160, ctx.currentTime)

  gain.gain.setValueAtTime(0.015, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

  osc1.start(ctx.currentTime)
  osc2.start(ctx.currentTime)
  osc1.stop(ctx.currentTime + 0.25)
  osc2.stop(ctx.currentTime + 0.25)
}

const WORDS = [
  "Punishing", "Keyboard", "Factory", "Conveyor", "Machine",
  "Typing", "Challenge", "Adventure", "Building", "Creative",
  "Platinum", "Thunder", "Whisper", "Gravity", "Diamond",
  "Spectrum", "Voltage", "Crystal", "Phantom", "Nebula",
  "Crimson", "Harmony", "Eclipse", "Breaker", "Zenith",
  "POWER", "swift", "QuickType", "BLAZE", "echo",
  "StarLight", "COSMIC", "puzzle", "MixCase", "rhythm",
]

const BALL_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
]

const BALL_SIZE = 50
const BALL_GAP = 6
const BALL_STEP = BALL_SIZE + BALL_GAP
const VISIBLE_COUNT = 14 // how many balls visible on the belt at once
const BUFFER_WORDS = 4 // how many words to keep queued

interface Ball {
  id: string
  letter: string
  typed: boolean
  color: string
  stuck: boolean
  wordIndex: number
  isSpace: boolean
}

function getRandomColor() {
  return BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]
}

function pickWord(usedIndices: Set<number>): { word: string; index: number } {
  let idx: number
  do {
    idx = Math.floor(Math.random() * WORDS.length)
  } while (usedIndices.has(idx) && usedIndices.size < WORDS.length)
  return { word: WORDS[idx], index: idx }
}

function generateBallsForWord(word: string, wordIndex: number, startId: number): Ball[] {
  return word.split("").map((letter, i) => ({
    id: `${startId}-${wordIndex}-${i}`,
    letter,
    typed: false,
    color: getRandomColor(),
    stuck: false,
    wordIndex,
    isSpace: false,
  }))
}



function ColorMachine({ splashActive, splashColor, smoking }: { splashActive: boolean; splashColor: string; smoking: boolean }) {
  return (
    <div className="relative" style={{ width: 120 }}>
      {/* Smoke particles */}
      {smoking && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none" style={{ width: 80, height: 40 }}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-smoke"
              style={{
                width: 8 + Math.random() * 10,
                height: 8 + Math.random() * 10,
                left: `${20 + Math.random() * 40}%`,
                bottom: 0,
                background: `rgba(120,120,120,${0.4 + Math.random() * 0.3})`,
                animationDelay: `${i * 80}ms`,
                animationDuration: `${0.8 + Math.random() * 0.6}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="absolute -top-2 left-6 w-4 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-t-full" />
      <div className="absolute -top-2 left-[52px] w-3 h-5 bg-gradient-to-b from-red-400 to-red-600 rounded-t-full" />
      <div className="absolute -top-2 right-6 w-4 h-6 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-full" />
      <div className="absolute left-0 top-6 w-7 h-[100px] bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-l-full z-0">
        <div className="absolute top-2 left-1.5 w-1 h-[90px] bg-blue-300/40 rounded-full" />
      </div>
      <div className="absolute right-0 top-6 w-7 h-[100px] bg-gradient-to-l from-yellow-400 via-yellow-500 to-yellow-600 rounded-r-full z-0">
        <div className="absolute top-2 right-1.5 w-1 h-[90px] bg-yellow-300/40 rounded-full" />
      </div>
      <div className="relative mx-5 z-10">
        <div className="w-[72px] h-3 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-t-lg mx-auto shadow-md" />
        <div className="w-16 h-24 mx-auto bg-gradient-to-r from-red-500 via-red-400 to-red-500 rounded-[32px] relative shadow-lg border-2 border-amber-500">
          <div className="absolute inset-2 bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-[28px]">
            <div className="absolute top-3 left-1.5 w-1.5 h-14 bg-red-300/40 rounded-full" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 shadow-sm"
              style={{ left: i < 3 ? "3px" : "auto", right: i >= 3 ? "3px" : "auto", top: `${16 + (i % 3) * 22}px` }} />
          ))}
        </div>
        <div className="absolute top-[52px] left-1/2 -translate-x-1/2 w-[72px] h-2.5 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded shadow-md z-20" />
        <div className="w-[72px] h-3 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-b-lg mx-auto shadow-md" />
        <div className="flex flex-col items-center">
          <div className="w-6 h-2 bg-gradient-to-b from-amber-500 to-amber-700 rounded" />
          <div className="relative w-10 h-6">
            <div className="absolute left-0.5 top-0 w-1.5 h-6 bg-gradient-to-b from-pink-500 to-pink-600 rounded-b-full -rotate-12" />
            <div className="absolute left-[14px] top-0 w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-b-full" />
            <div className="absolute right-1 top-0 w-1.5 h-6 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b-full rotate-12" />
          </div>
          <div className="w-5 h-3 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-lg -mt-1.5">
            <div className="w-3 h-1.5 mx-auto bg-amber-900 rounded-b" />
          </div>
          <div className="transition-opacity duration-200" style={{ opacity: splashActive ? 1 : 0.3 }}>
            <div className="flex gap-px justify-center">
              <div className="w-1 h-3 rounded-b-full animate-drip" style={{ background: splashColor, animationDelay: "0ms" }} />
              <div className="w-1.5 h-5 rounded-b-full animate-drip" style={{ background: splashColor, animationDelay: "80ms" }} />
              <div className="w-1 h-2.5 rounded-b-full animate-drip" style={{ background: splashColor, animationDelay: "160ms" }} />
            </div>
            {splashActive && (
              <div className="flex gap-0.5 justify-center mt-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full animate-splash"
                    style={{ background: splashColor, animationDelay: `${i * 40}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TypingGame() {
  const [balls, setBalls] = useState<Ball[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [score, setScore] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wordsCompleted, setWordsCompleted] = useState(0)

  const [gameStarted, setGameStarted] = useState(false)
  const [splashActive, setSplashActive] = useState(false)
  const [splashColor, setSplashColor] = useState("#22c55e")
  const [machineSmoking, setMachineSmoking] = useState(false)
  const [completedBalls, setCompletedBalls] = useState<string[]>([])
  const [wordQueue, setWordQueue] = useState<{ word: string; startIdx: number; endIdx: number; completed: boolean }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const wordCountRef = useRef(0)
  const usedIndicesRef = useRef<Set<number>>(new Set())
  const idCounterRef = useRef(0)

  const appendWords = useCallback((existingBalls: Ball[], count: number) => {
    let newBalls = [...existingBalls]
    const newQueue: typeof wordQueue = []
    for (let w = 0; w < count; w++) {
      // Add a space ball between words (not before the very first word)
      if (newBalls.length > 0) {
        newBalls.push({
          id: `space-${idCounterRef.current++}`,
          letter: "",
          typed: false,
          color: "#94a3b8",
          stuck: false,
          wordIndex: -1,
          isSpace: true,
        })
      }
      const { word, index: wordIdx } = pickWord(usedIndicesRef.current)
      usedIndicesRef.current.add(wordIdx)
      if (usedIndicesRef.current.size >= WORDS.length) usedIndicesRef.current.clear()
      const wordNumber = wordCountRef.current++
      const startIdx = newBalls.length
      const wordBalls = generateBallsForWord(word, wordNumber, idCounterRef.current++)
      newBalls = [...newBalls, ...wordBalls]
      const endIdx = newBalls.length - 1
      newQueue.push({ word, startIdx, endIdx, completed: false })
    }
    return { balls: newBalls, queue: newQueue }
  }, [])

  const initGame = useCallback(() => {
    wordCountRef.current = 0
    usedIndicesRef.current.clear()
    idCounterRef.current = 0
    const { balls: newBalls, queue } = appendWords([], BUFFER_WORDS)
    setBalls(newBalls)
    setWordQueue(queue)
    setCurrentIndex(0)
    setGameStarted(true)
  }, [appendWords])

  useEffect(() => {
    initGame()
  }, [initGame])

  // Keep the buffer topped up: when we're within 2 words of the end, add more
  useEffect(() => {
    if (!gameStarted || balls.length === 0) return
    const lastQueueItem = wordQueue[wordQueue.length - 1]
    if (lastQueueItem && currentIndex >= lastQueueItem.startIdx - BALL_SIZE) {
      const { balls: moreBalls, queue: moreQueue } = appendWords(balls, 2)
      setBalls(moreBalls)
      setWordQueue((prev) => [...prev, ...moreQueue])
    }
  }, [currentIndex, balls, wordQueue, gameStarted, appendWords])



  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || !gameStarted) return
      if (e.key.length !== 1) return
      const currentBall = balls[currentIndex]
      if (!currentBall) return

      // If current ball is a space ball, require spacebar to advance
      if (currentBall.isSpace) {
        if (e.key === " ") {
          e.preventDefault()
          playCorrectSound()
          setBalls((prev) =>
            prev.map((ball, idx) =>
              idx === currentIndex ? { ...ball, typed: true } : ball
            )
          )
          setCurrentIndex(currentIndex + 1)
        }
        return
      }

      if (e.key === currentBall.letter) {
        playCorrectSound()
        const ballColor = currentBall.color
        setSplashColor(ballColor)
        setSplashActive(true)
        setTimeout(() => setSplashActive(false), 400)

        setBalls((prev) =>
          prev.map((ball, idx) =>
            idx === currentIndex ? { ...ball, typed: true, stuck: false } : ball
          )
        )
        const nextIdx = currentIndex + 1
        setCurrentIndex(nextIdx)
        setScore((prev) => prev + 10)

        // Check if we just finished a word
        setWordQueue((prev) =>
          prev.map((wq) => {
            if (!wq.completed && currentIndex === wq.endIdx) {
              setWordsCompleted((c) => c + 1)
              setScore((s) => s + 50) // bonus for completing a word
              const wordColors = balls.slice(wq.startIdx, wq.endIdx + 1).map((b) => b.color)
              setCompletedBalls((cb) => [...cb, ...wordColors])
              return { ...wq, completed: true }
            }
            return wq
          })
        )
      } else {
        playWrongSound()
        setErrors((prev) => prev + 1)
        setMachineSmoking(true)
        setTimeout(() => setMachineSmoking(false), 1200)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, isPaused, gameStarted, balls])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const resetGame = () => {
    setScore(0)
    setErrors(0)
    setWordsCompleted(0)
    setCompletedBalls([])
    initGame()
    setIsPaused(false)
  }

  const NOZZLE_LEFT_PCT = 32

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden select-none"
      style={{ background: "linear-gradient(180deg, #1e3a5f 0%, #2d4a6f 50%, #1a2f4a 100%)" }}
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute"
        autoFocus
        onBlur={() => setTimeout(() => inputRef.current?.focus(), 100)}
      />

      {/* Header */}
      <div className="w-full max-w-4xl mb-4">
        <div className="flex items-center justify-between bg-slate-800/80 rounded-xl p-3 backdrop-blur-sm border border-slate-600">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)}
              className="bg-amber-500 hover:bg-amber-600 border-amber-600 text-white">
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={resetGame}
              className="bg-slate-600 hover:bg-slate-700 border-slate-500 text-white">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex gap-6 text-white">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Score</div>
              <div className="text-2xl font-bold text-amber-400">{score}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Words</div>
              <div className="text-2xl font-bold text-green-400">{wordsCompleted}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Errors</div>
              <div className="text-2xl font-bold text-red-400">{errors}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-4xl">
        {/* Background gears */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div className="absolute -left-16 top-20 w-40 h-40 rounded-full border-8 border-slate-600/25"
            style={{ animation: isPaused ? "none" : "spin 10s linear infinite" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute w-3.5 h-7 bg-slate-600/25 rounded"
                style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-62px)` }} />
            ))}
          </div>
          <div className="absolute right-32 -top-4 w-28 h-28 rounded-full border-[5px] border-slate-600/15"
            style={{ animation: isPaused ? "none" : "spin 8s linear infinite reverse" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute w-2.5 h-5 bg-slate-600/15 rounded"
                style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-40px)` }} />
            ))}
          </div>
        </div>

        <div className="relative bg-slate-800/60 rounded-xl p-6 pb-8 backdrop-blur-sm border border-slate-600">
          {/* Color Machine */}
          <div className="relative flex justify-center mb-2">
            <div className="absolute z-30" style={{ left: `${NOZZLE_LEFT_PCT}%`, transform: "translateX(-50%)" }}>
              <ColorMachine splashActive={splashActive} splashColor={splashColor} smoking={machineSmoking} />
            </div>
            <div style={{ height: 180 }} />
          </div>

          {/* Conveyor Belt with Balls */}
          <div className="relative">
            <div className="relative overflow-hidden" style={{ height: BALL_SIZE + 14 }}>
              <div
                className="absolute flex items-end transition-transform duration-500 ease-in-out"
                style={{
                  left: `${NOZZLE_LEFT_PCT}%`,
                  bottom: 4,
                  gap: `${BALL_GAP}px`,
                  transform: `translateX(calc(-${BALL_SIZE / 2}px - ${currentIndex * BALL_STEP}px))`,
                }}
              >
                {balls.map((ball, idx) => {
                  const isActive = idx === currentIndex
                  const isPast = idx < currentIndex

                  // Space ball rendering
                  if (ball.isSpace) {
                    return (
                      <div key={ball.id} className="relative flex-shrink-0">
                        <div
                          style={{
                            width: BALL_SIZE, height: BALL_SIZE,
                          }}
                        >
                          <div
                            className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                            style={{
                              background: ball.typed
                                ? "radial-gradient(circle at 35% 30%, #64748bdd, #475569)"
                                : isActive
                                  ? "radial-gradient(circle at 35% 30%, #cbd5e1, #94a3b8)"
                                  : "radial-gradient(circle at 35% 30%, #d1d5db, #9ca3af)",
                              boxShadow: isActive
                                ? "0 4px 16px rgba(251,191,36,0.3), inset 0 -3px 6px rgba(0,0,0,0.1)"
                                : "0 2px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)",
                              border: isActive ? "2px dashed rgba(251,191,36,0.5)" : "2px dashed rgba(148,163,184,0.3)",
                            }}
                          >
                            <div className="absolute top-1.5 left-2 w-3.5 h-3.5 bg-white/25 rounded-full blur-[2px]" />
                          </div>
                          {isActive && !ball.typed && (
                            <div className="absolute -inset-1.5 rounded-full border-2 border-amber-400/60 animate-pulse" style={{ pointerEvents: "none" }} />
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={ball.id} className="relative flex-shrink-0">
                      <div
                        className="relative"
                        style={{
                          width: BALL_SIZE, height: BALL_SIZE,
                        }}
                      >
                        {ball.typed ? (
                          <div
                            className="w-full h-full rounded-full"
                            style={{
                              background: `radial-gradient(circle at 35% 30%, ${ball.color}ee, ${ball.color})`,
                              boxShadow: `0 4px 20px ${ball.color}66, inset 0 -3px 6px rgba(0,0,0,0.2)`,
                            }}
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                            style={{
                              background: "radial-gradient(circle at 35% 30%, #e2e8f0, #94a3b8)",
                              color: "#374151",
                              boxShadow: isActive
                                ? "0 4px 16px rgba(251,191,36,0.3), inset 0 -3px 6px rgba(0,0,0,0.1)"
                                : "0 2px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <div className="absolute top-1.5 left-2 w-3.5 h-3.5 bg-white/35 rounded-full blur-[2px]" />
                            <div className="absolute top-2.5 left-3.5 w-1.5 h-1 bg-white/20 rounded-full" />
                            <span className="relative z-10 font-mono text-lg font-bold">
                              {ball.letter}
                            </span>
                          </div>
                        )}

                        {isActive && !ball.typed && (
                          <div className="absolute -inset-1.5 rounded-full border-2 border-amber-400/60 animate-pulse" style={{ pointerEvents: "none" }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Conveyor Belt */}
            <div className="relative h-9 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-lg overflow-hidden border-[3px] border-slate-700">
              <div className="absolute inset-0" style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 36px, rgba(0,0,0,0.15) 36px, rgba(0,0,0,0.15) 40px)",
              }} />
              <div className="absolute inset-0 flex items-center justify-around px-3">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{
                    background: "radial-gradient(circle at 30% 30%, #b0b8c4, #64748b)",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                  }} />
                ))}
              </div>
            </div>
            <div className="flex justify-around mt-0.5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-5 h-3 bg-gradient-to-b from-slate-600 to-slate-700 rounded-b" />
              ))}
            </div>
          </div>

          {/* Completed Balls Pool */}
          <div className="mt-4 h-14 bg-slate-900/50 rounded-lg overflow-hidden relative border border-slate-700">
            <div className="absolute inset-0 flex items-center flex-wrap gap-1 p-2 overflow-hidden">
              {completedBalls.slice(-60).map((color, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{
                  background: `radial-gradient(circle at 30% 30%, ${color}ee, ${color})`,
                  boxShadow: `0 1px 3px ${color}44`,
                }} />
              ))}
              {completedBalls.length === 0 && (
                <span className="text-slate-600 text-xs mx-auto">Completed balls collect here</span>
              )}
            </div>
          </div>
        </div>
      </div>

     
      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">PAUSED</h2>
            <Button onClick={() => setIsPaused(false)} className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 text-lg">
              <Play className="mr-2 h-5 w-5" /> Resume
            </Button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes smoke {
          0% { transform: translateY(0) scale(0.5); opacity: 0.7; }
          50% { transform: translateY(-18px) scale(1.2); opacity: 0.4; }
          100% { transform: translateY(-36px) scale(1.6); opacity: 0; }
        }
        .animate-smoke { animation: smoke 1s ease-out forwards; }
        @keyframes drip {
          0%, 100% { opacity: 0.5; transform: translateY(0) scaleY(1); }
          50% { opacity: 1; transform: translateY(3px) scaleY(1.3); }
        }
        .animate-drip { animation: drip 0.6s ease-in-out infinite; }
        @keyframes splash {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-splash { animation: splash 0.4s ease-out forwards; }
        @keyframes colorFill {
          0% { opacity: 0.8; transform: scale(0.5); }
          50% { opacity: 0.4; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1); }
        }
        .animate-colorFill { animation: colorFill 0.5s ease-out forwards; }

      `}</style>
    </div>
  )
}
