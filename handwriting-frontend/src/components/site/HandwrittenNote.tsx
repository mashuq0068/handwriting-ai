/**
 * A handwriting animation that writes out a real, legible note line-by-line
 * and finishes with a signed flourish — a "pure" signature animation rather
 * than a scribble. Each line is revealed left-to-right (as if written), a pen
 * nib rides the signature stroke, and a flourish underline draws last.
 *
 * `loop` keeps it cycling for the marketing hero; turn off for a single play.
 */
export default function HandwrittenNote({ loop = true }: { loop?: boolean }) {
  const cls = (base: string) => (loop ? `${base} loop` : base);

  return (
    <svg
      viewBox="0 0 760 280"
      className="w-full h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="A handwritten note being written and signed"
      role="img"
    >
      <defs>
        {/* Left-to-right reveal masks, one per line, staggered in time */}
        <clipPath id="hw-line1">
          <rect className={cls("hw-wipe hw-wipe-1")} x="0" y="0" height="280" />
        </clipPath>
        <clipPath id="hw-line2">
          <rect className={cls("hw-wipe hw-wipe-2")} x="0" y="0" height="280" />
        </clipPath>
        <clipPath id="hw-sign">
          <rect className={cls("hw-wipe hw-wipe-3")} x="0" y="0" height="280" />
        </clipPath>
      </defs>

      <g className={cls("hw-note")}>
        {/* Body of the note — Caveat, reads like a quick handwritten line */}
        <text
          clipPath="url(#hw-line1)"
          x="40"
          y="58"
          fill="hsl(var(--ink-blue))"
          style={{ fontFamily: "'Caveat', cursive", fontSize: 40, fontWeight: 600 }}
        >
          Dear Priya,
        </text>
        <text
          clipPath="url(#hw-line2)"
          x="40"
          y="112"
          fill="hsl(var(--ink-blue))"
          style={{ fontFamily: "'Caveat', cursive", fontSize: 40, fontWeight: 500 }}
        >
          thank you — this means the world to me.
        </text>

        {/* The signature — Dancing Script, larger, the climactic stroke */}
        <text
          clipPath="url(#hw-sign)"
          x="56"
          y="218"
          fill="hsl(var(--ink-blue))"
          style={{ fontFamily: "'Dancing Script', cursive", fontSize: 84, fontWeight: 700 }}
        >
          Quillify
        </text>

        {/* Flourish underline, drawn as a single continuous stroke */}
        <path
          className={cls("hw-flourish")}
          d="M60,238 C150,228 320,232 360,222 C385,216 330,250 300,244 C440,236 470,234 520,236"
          stroke="hsl(var(--accent))"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Pen nib riding the signature stroke */}
        <circle
          className={cls("hw-nib")}
          cx="0"
          cy="196"
          r="5"
          fill="hsl(var(--accent))"
        />
      </g>
    </svg>
  );
}
