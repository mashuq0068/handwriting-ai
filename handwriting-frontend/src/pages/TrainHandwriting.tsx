import { useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Check, Camera, Sparkles } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_LINES = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "How vexingly quick daft zebras jump!",
];

export default function TrainHandwriting() {
  const [name, setName] = useState("My handwriting");
  const [uploaded, setUploaded] = useState(0);
  const [step, setStep] = useState(1);

  return (
    <PageShell>
      <section className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Train your handwriting</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-3">Teach Quillify your hand.</h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">It takes about 5 minutes. You'll get a model that can write anything in your style.</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </span>
                {s < 3 && <span className={`h-0.5 w-12 ${step > s ? "bg-primary" : "bg-secondary"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Step 1 — Print the worksheet</h2>
                <p className="text-muted-foreground">Write these three lines on plain paper using a pen you like. Try to keep your normal pace and slant.</p>
              </div>
              <div className="paper-ruled p-6 rounded-xl space-y-3">
                {SAMPLE_LINES.map((l, i) => (
                  <p key={i} className="font-hand ink-text text-2xl">{l}</p>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Done writing — next</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Step 2 — Upload photos</h2>
                <p className="text-muted-foreground">Take 3–5 clear photos of your handwritten lines in good light.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => setUploaded((u) => Math.min(3, u + 1))}
                    className={`aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition ${
                      uploaded > i ? "border-accent bg-accent/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {uploaded > i ? (
                      <>
                        <Check className="h-6 w-6 text-accent mb-1" />
                        <p className="text-xs text-muted-foreground">Sample {i + 1} uploaded</p>
                      </>
                    ) : (
                      <>
                        <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Upload sample {i + 1}</p>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={uploaded < 3}>Train model</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6 text-center">
              <Sparkles className="h-10 w-10 text-accent mx-auto" />
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Your hand is ready!</h2>
                <p className="text-muted-foreground">Quillify trained your model in 3 minutes. Here's a preview:</p>
              </div>
              <div className="paper-ruled p-6 rounded-xl text-left">
                <p className="font-hand ink-text text-2xl leading-snug">
                  Hi! This is what your handwriting looks like in Quillify. Pretty close, right? You can use this style anywhere in the app.
                </p>
              </div>
              <div className="max-w-sm mx-auto text-left">
                <label className="text-sm font-semibold">Name this hand</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>Retrain</Button>
                <Link to="/dashboard"><Button onClick={() => toast.success("Saved to your library")}>Save & finish</Button></Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
