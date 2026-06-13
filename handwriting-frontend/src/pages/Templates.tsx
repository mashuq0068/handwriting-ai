import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const TEMPLATES = [
  { name: "Casual", font: "font-hand", tag: "Most popular", paper: "paper-ruled" },
  { name: "Neat Notes", font: "font-kalam", tag: "Study", paper: "paper-grid" },
  { name: "Vintage", font: "font-apple", tag: "Letters", paper: "paper-ruled" },
  { name: "Sketchy", font: "font-shadows", tag: "Cards", paper: "paper-dot" },
  { name: "Playful", font: "font-indie", tag: "Kids", paper: "paper-dot" },
  { name: "Elegant", font: "font-dancing", tag: "Formal", paper: "" },
  { name: "Architect", font: "font-architect", tag: "Engineering", paper: "paper-grid" },
  { name: "Quill", font: "font-dancing", tag: "Calligraphy", paper: "" },
  { name: "Schoolbook", font: "font-kalam", tag: "K–12", paper: "paper-ruled" },
];

const SAMPLE = "The early morning rain tapped softly on the window as I started writing this letter to you.";

export default function Templates() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Templates</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-3">Twelve hands. One you.</h1>
            <p className="text-muted-foreground mt-3 text-lg">Every template is fully customizable — ink color, slant, size, line spacing, paper. Or train your own and add it to this gallery.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition">
                <div className={`p-6 h-44 ${t.paper}`}>
                  <p className={`${t.font} ink-text text-xl leading-snug`}>{SAMPLE}</p>
                </div>
                <div className="p-5 flex items-center justify-between border-t border-border">
                  <div>
                    <p className="font-display font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.tag}</p>
                  </div>
                  <Link to="/editor">
                    <Button size="sm" variant="outline">Use</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 rounded-2xl bg-primary text-primary-foreground p-10 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Don't see your handwriting?</h2>
            <p className="text-primary-foreground/80 mt-2">Upload a few samples and train Quillify on your own hand in under five minutes.</p>
            <Link to="/train"><Button size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">Train your handwriting</Button></Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
