import { useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, PenLine } from "lucide-react";

const PROMPTS = [
  "Write a school leave application for 2 days",
  "Write a thank-you note to my professor",
  "Write a casual birthday card for my best friend",
  "Write a formal job application for a marketing role",
  "Write an apology for missing a meeting",
];

const SAMPLE_REPLY = `Dear Ms. Patel,

I hope this note finds you well. I'm writing to ask for a short leave of absence from class on Thursday and Friday this week (March 14–15) for a family commitment that I unfortunately can't reschedule.

I've already spoken to Riya about getting the notes I'll miss, and I'll make sure to complete the homework due on Monday before I'm back.

Thank you for understanding.

Warmly,
Alex`;

type Msg = { role: "user" | "ai"; text: string };

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! Tell me what you'd like to write — a leave letter, a thank-you note, a job application, anything. I'll draft it, then we'll hand-write it." },
  ]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: SAMPLE_REPLY }]);
    setInput("");
  };

  return (
    <PageShell>
      <section className="flex-1 py-10">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
              <Sparkles className="h-3.5 w-3.5" /> AI Assistant
            </span>
            <h1 className="font-display text-4xl font-bold mt-3">What should we write today?</h1>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col h-[60vh] min-h-[480px]">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-secondary/40">
              <Bot className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">Quillify Assistant</span>
            </div>
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "ai" ? (
                    <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%] space-y-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                      {i > 0 && (
                        <div className="flex gap-2 pt-1 border-t border-border/50">
                          <Link to="/editor"><Button size="sm" variant="outline" className="h-7 text-xs"><PenLine className="h-3 w-3 mr-1" /> Open in editor</Button></Link>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">Regenerate</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">{m.text}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything…"
                  className="flex-1"
                />
                <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Try one of these</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-sm hover:bg-secondary/70 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
