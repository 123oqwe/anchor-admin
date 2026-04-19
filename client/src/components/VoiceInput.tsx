/**
 * Voice Input — press and hold to speak, release to send.
 * Uses Web Speech API (free, built into browser, no API key).
 *
 * Keyboard: hold Cmd+Shift to talk
 * Button: hold the mic button
 */
import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onerror = () => { setListening(false); };
    recognition.onend = () => { setListening(false); };

    recognitionRef.current = recognition;

    // Keyboard shortcut: hold Cmd+Shift
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && !e.repeat && !listening) {
        e.preventDefault();
        startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((!e.metaKey || !e.shiftKey) && listening) {
        stopListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      recognition.abort();
    };
  }, [supported, listening]);

  const startListening = () => {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    setListening(true);
    try { recognitionRef.current.start(); } catch {}
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    setListening(false);
    try { recognitionRef.current.stop(); } catch {}

    // Send transcript after a brief delay for final result
    setTimeout(() => {
      const final = transcript.trim();
      if (final) {
        onTranscript(final);
        setTranscript("");
      }
    }, 300);
  };

  if (!supported) return null;

  return (
    <div className={className}>
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onMouseLeave={() => listening && stopListening()}
        className={`relative p-2 rounded-full transition-all ${listening ? "bg-red-500/20 text-red-400 scale-110" : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"}`}
        title="Hold to speak (or Cmd+Shift)"
      >
        {listening ? <Mic className="h-4 w-4 animate-pulse" /> : <MicOff className="h-4 w-4" />}
        {listening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-red-400"
          />
        )}
      </button>

      <AnimatePresence>
        {listening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass rounded-lg px-3 py-1.5 text-xs text-foreground whitespace-nowrap max-w-xs truncate"
          >
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
