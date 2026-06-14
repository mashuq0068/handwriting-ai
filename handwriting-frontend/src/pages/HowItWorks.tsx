import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Wand2, PenLine, Download, ArrowRight, Upload, Sparkles, Settings } from "lucide-react";

const STEPS = [
  { icon: FileText, title: "1. Bring your content", body: "Paste plain text, drop a PDF, upload a DOCX, or ask the AI assistant to write it for you. Quillify reads structure, paragraphs, and lists." },
  { icon: PenLine, title: "2. Pick a handwriting style", body: "Choose from twelve built-in hands — neat, casual, vintage, playful, formal — or use one you've trained from your own writing." },
  { icon: Settings, title: "3. Fine-tune the page", body: "Adjust ink color, slant, line spacing, paper type (ruled, plain, grid), and margins. Add natural imperfections like ink bleed and stroke jitter." },
  { icon: Download, title: "4. Export & share", body: "Download as PDF, PNG, or JPG. Print at home, attach to an email, or save it to your library for later." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">How it works</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold mt-3 leading-tight">
            From typed text to <span className="font-hand ink-text text-[1.15em]">handwritten page</span> in minutes.
          </h1>
          <p className="text-muted-foreground mt-5 text-lg">No design skills, no scanner, no calligraphy practice required.</p>
        </div>

        <div className="mx-auto max-w-4xl px-5 mt-16 space-y-6">
          {STEPS.map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-7 md:p-8 flex gap-6 items-start">
              <span className="h-12 w-12 shrink-0 rounded-xl bg-primary text-primary-foreground grid place-items-center">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold">{s.title}</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-4xl px-5 mt-20 grid md:grid-cols-3 gap-5">
          {[
            { icon: PenLine, title: "Train (Manual)", body: "Write each letter once — or print a template, fill it, photograph it.", to: "/handwriting/manual" },
            { icon: Sparkles, title: "Train (AI)", body: "Upload any handwriting photo and let AI extract your letters.", to: "/handwriting/ai" },
            { icon: Wand2, title: "Open the editor", body: "Live preview, real-time tweaks, instant export.", to: "/editor" },
          ].map((c) => (
            <Link key={c.title} to={c.to} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition group">
              <c.icon className="h-6 w-6 text-accent mb-3" />
              <h3 className="font-display font-bold mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.body}</p>
              <p className="text-xs font-semibold mt-3 inline-flex items-center text-primary group-hover:gap-2 gap-1 transition-all">
                Open <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link to="/register"><Button size="lg">Start writing free</Button></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
