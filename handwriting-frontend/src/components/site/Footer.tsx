import { Link } from "react-router-dom";
import { PenLine, Twitter, Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40 mt-24">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <PenLine className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold">Quillify</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs">
            Turn typed text into convincingly real handwriting. Train your own style, generate from AI, export to PDF.
          </p>
          <div className="flex gap-3 pt-2 text-muted-foreground">
            <a href="#" aria-label="Twitter"><Twitter className="h-4 w-4 hover:text-foreground" /></a>
            <a href="#" aria-label="GitHub"><Github className="h-4 w-4 hover:text-foreground" /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin className="h-4 w-4 hover:text-foreground" /></a>
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
            <li><Link to="/templates" className="hover:text-foreground">Templates</Link></li>
            <li><Link to="/assistant" className="hover:text-foreground">AI Assistant</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-3">Use cases</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground">School notes</a></li>
            <li><a className="hover:text-foreground">Job applications</a></li>
            <li><a className="hover:text-foreground">Leave letters</a></li>
            <li><a className="hover:text-foreground">Greeting cards</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground">About</a></li>
            <li><a className="hover:text-foreground">Privacy</a></li>
            <li><a className="hover:text-foreground">Terms</a></li>
            <li><a className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted-foreground flex justify-between">
          <p>© {new Date().getFullYear()} Quillify. All rights reserved.</p>
          <p className="font-hand text-base">— made with ink &amp; pixels</p>
        </div>
      </div>
    </footer>
  );
}
