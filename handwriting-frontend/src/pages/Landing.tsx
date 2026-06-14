import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import HandwrittenNote from "@/components/site/HandwrittenNote";
import {
  FileText,
  Upload,
  Sparkles,
  Download,
  PenLine,
  Wand2,
  ScrollText,
  GraduationCap,
  Briefcase,
  Heart,
  Mail,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";

const FONTS = [
  { name: "Casual", className: "font-hand", sample: "Hey, just a quick note —" },
  { name: "Neat", className: "font-kalam", sample: "Hey, just a quick note —" },
  { name: "Vintage", className: "font-apple", sample: "Hey, just a quick note —" },
  { name: "Sketchy", className: "font-shadows", sample: "Hey, just a quick note —" },
  { name: "Playful", className: "font-indie", sample: "Hey, just a quick note —" },
  { name: "Elegant", className: "font-dancing", sample: "Hey, just a quick note —" },
];

const USE_CASES = [
  { icon: GraduationCap, title: "School leave letters", body: "Hand it in on real-looking paper, every time." },
  { icon: Briefcase, title: "Job applications", body: "Stand out with a personal, handwritten cover." },
  { icon: Heart, title: "Cards & notes", body: "Birthdays, thank-yous, love letters — instantly." },
  { icon: Mail, title: "Excuse letters", body: "Polished, plausible, ready to print." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 paper-dot opacity-40 pointer-events-none" />
        {/* Grid, strongest through the middle and faded at the edges */}
        <div
          className="absolute inset-0 paper-grid opacity-70 pointer-events-none"
          style={{
            maskImage:
              "radial-gradient(ellipse 55% 60% at 50% 42%, #000 30%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 55% 60% at 50% 42%, #000 30%, transparent 78%)",
          }}
        />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        {/* Text — top, centered */}
        <div className="relative mx-auto max-w-3xl px-5 pt-16 md:pt-24 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Now with AI letter writer
          </span>
          <h1 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.02]">
            Type it. <span className="font-hand text-[1.15em] ink-text font-normal">Handwrite it.</span> Print it.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Quillify turns typed text, PDFs, and AI-written letters into pages that look genuinely
            handwritten — with your own handwriting if you want.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-7">
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/editor">
              <Button size="lg" variant="outline" className="px-7">Try the editor</Button>
            </Link>
          </div>
          <div className="mt-7 flex items-center justify-center gap-4">
            <div className="flex -space-x-2">
              {["bg-amber-300", "bg-emerald-400", "bg-blue-300", "bg-rose-300"].map((c, i) => (
                <span key={i} className={`h-7 w-7 rounded-full border-2 border-background ${c}`} />
              ))}
            </div>
            <div className="text-sm text-left">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />)}
              </div>
              <p className="text-muted-foreground text-xs">12,400+ pages handwritten this week</p>
            </div>
          </div>
        </div>

        {/* Signature note — bottom, written out live with floating style pills */}
        <div className="relative mx-auto max-w-2xl px-5 pt-14 pb-24 md:pb-32">
          {/* Floating prompt / style pills */}
          {[
            { label: "Casual hand", pos: "left-0 -top-1 md:-left-10", rot: "-6deg", delay: "0s" },
            { label: "Your handwriting", pos: "right-0 top-6 md:-right-12", rot: "5deg", delay: "0.8s" },
            { label: "AI-written", pos: "left-2 bottom-10 md:-left-16", rot: "4deg", delay: "1.6s" },
            { label: "Print-ready PDF", pos: "right-2 bottom-2 md:-right-10", rot: "-4deg", delay: "1.1s" },
          ].map((p) => (
            <span
              key={p.label}
              className={`float-pill absolute z-10 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-md text-xs font-medium ${p.pos}`}
              style={{ ["--pill-rot" as string]: p.rot, animationDelay: p.delay }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {p.label}
            </span>
          ))}

          <div className="relative rounded-2xl bg-card shadow-2xl border border-border p-6 md:p-8 paper-ruled">
            <HandwrittenNote />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>written just now</span>
              <span>no two pages look the same ✨</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-secondary/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">How it works</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">Three steps to a handwritten page</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: FileText, n: "01", title: "Bring your text", body: "Paste it, upload a PDF or DOCX, or ask the AI to write it for you." },
              { icon: PenLine, n: "02", title: "Pick a hand", body: "Use a built-in style, or train Quillify on a sample of your own handwriting." },
              { icon: Download, n: "03", title: "Export & print", body: "Get a print-ready PDF with realistic ink pressure, paper texture, and natural variation." },
            ].map((s, i) => (
              <div key={i} className="relative rounded-2xl bg-card border border-border p-7 shadow-sm">
                <span className="absolute -top-3 left-6 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded">{s.n}</span>
                <s.icon className="h-7 w-7 text-accent mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HANDWRITING STYLES */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Styles</span>
              <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">Pick a hand that fits the mood</h2>
              <p className="text-muted-foreground mt-3 max-w-lg">Twelve built-in styles, plus your own. Each one ships with adjustable ink, slant, size, and spacing.</p>
            </div>
            <Link to="/templates">
              <Button variant="outline">Browse all templates <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FONTS.map((f) => (
              <div key={f.name} className="group rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-secondary">Included</span>
                </div>
                <p className={`${f.className} ink-text text-3xl leading-snug`}>{f.sample}</p>
                <p className={`${f.className} ink-text text-xl mt-2 opacity-80`}>the quick brown fox jumps over the lazy dog.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAIN YOUR OWN */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative mx-auto max-w-6xl px-5 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Your own handwriting</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold">Train Quillify on your hand.</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Upload a few photos of your handwriting. Our model studies your letterforms, slant, pressure, and spacing — then writes anything as if you wrote it.
            </p>
            <ul className="space-y-3">
              {[
                "Train from just 3–5 sample images",
                "Multiple personal hands per account",
                "Realistic line jitter, ink pooling, and stroke variation",
                "Your samples stay private",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-primary-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
            <Link to="/handwriting/manual">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Train my handwriting <Upload className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { f: "font-apple", t: "Sample 1" },
              { f: "font-architect", t: "Sample 2" },
              { f: "font-indie", t: "Sample 3" },
              { f: "font-hand", t: "Trained model" },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl bg-card text-card-foreground p-5 paper-ruled ${i === 3 ? "ring-2 ring-accent col-span-2" : ""}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{s.t}</p>
                <p className={`${s.f} ink-text text-xl leading-relaxed`}>
                  {i === 3 ? "Hi Sam, thanks so much for the book — it's exactly what I needed this week. Talk soon!" : "Thanks for the help today!"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24 bg-secondary/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Who uses it</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">For the times typed just won't do.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USE_CASES.map((u) => (
              <div key={u.title} className="rounded-2xl bg-card border border-border p-6">
                <span className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center mb-4">
                  <u.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display font-bold mb-1.5">{u.title}</h3>
                <p className="text-sm text-muted-foreground">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <ScrollText className="h-8 w-8 mx-auto text-accent mb-6" />
          <p className="font-display text-2xl md:text-3xl leading-relaxed">
            "I sent my professor a handwritten thank-you note. He thought I'd actually written it out. <span className="font-hand ink-text text-4xl">I did not.</span>"
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-rose-400" />
            <div className="text-left">
              <p className="font-semibold text-sm">Priya M.</p>
              <p className="text-xs text-muted-foreground">Grad student, Boston</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-5">
          <div className="rounded-3xl bg-primary text-primary-foreground p-12 md:p-16 text-center grain relative overflow-hidden">
            <h2 className="font-display text-3xl md:text-5xl font-bold">
              Your next letter is one click from looking <span className="font-hand text-[1.2em] text-accent">handwritten.</span>
            </h2>
            <p className="text-primary-foreground/80 mt-4 max-w-md mx-auto">
              Free to start. No credit card. Five pages on us.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
                  Create free account <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/editor">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                  Try without signup
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
