import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    sub: "Forever",
    features: ["5 handwritten pages / month", "6 built-in styles", "PDF export", "Watermark on exports"],
    cta: "Start free",
    to: "/register",
  },
  {
    name: "Personal",
    price: "$9",
    sub: "per month",
    highlight: true,
    features: ["Unlimited pages", "All 12 built-in styles", "Train 3 custom hands", "PDF + PNG + JPG export", "No watermark", "AI assistant included"],
    cta: "Start 7-day trial",
    to: "/register",
  },
  {
    name: "Studio",
    price: "$29",
    sub: "per month",
    features: ["Everything in Personal", "Unlimited trained hands", "API access", "Bulk document conversion", "Priority support"],
    cta: "Contact sales",
    to: "/register",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-3">Simple. Like a postcard.</h1>
            <p className="text-muted-foreground mt-3 text-lg">Try it free. Upgrade when you need more pages.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((t) => (
              <div key={t.name} className={`rounded-2xl border p-8 flex flex-col ${t.highlight ? "border-primary bg-card shadow-xl scale-[1.02]" : "border-border bg-card"}`}>
                {t.highlight && <span className="text-xs font-bold uppercase tracking-wider text-accent mb-3">Most popular</span>}
                <h3 className="font-display text-2xl font-bold">{t.name}</h3>
                <p className="mt-4">
                  <span className="font-display text-5xl font-extrabold">{t.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">/ {t.sub}</span>
                </p>
                <ul className="mt-7 space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={t.to} className="mt-8">
                  <Button className={`w-full ${t.highlight ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                    {t.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Frequently asked</h2>
            <div className="space-y-4">
              {[
                { q: "Does it really look handwritten?", a: "Yes — Quillify adds natural variation to every letter, slight baseline drift, ink pressure, and stroke jitter. Up close, even people who know look twice." },
                { q: "Can I use my own handwriting?", a: "Absolutely. Upload 3–5 sample images on Personal or Studio. Training takes a few minutes." },
                { q: "What file types can I import?", a: "PDF, DOCX, TXT, Markdown, or just paste in text. The AI assistant can also write from scratch." },
                { q: "Is my handwriting private?", a: "Your trained model and samples are private to your account. We never train shared models on personal samples." },
              ].map((f) => (
                <details key={f.q} className="rounded-xl border border-border bg-card p-5 group">
                  <summary className="font-semibold cursor-pointer flex items-center justify-between">
                    {f.q}
                    <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
