export default function SignatureHero({ loop = true }: { loop?: boolean }) {
  return (
    <svg
      viewBox="0 0 600 200"
      className="w-full h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Animated handwritten signature"
    >
      {/* "Quillify" handwritten path */}
      <path
        className={loop ? "signature-path loop" : "signature-path"}
        d="M40,130 C40,70 110,50 130,90 C145,120 110,150 90,135 C75,124 100,100 130,95 C160,90 175,120 185,140
           M210,80 L210,150 M210,80 C220,75 230,75 235,85
           M260,80 L260,150
           M285,80 L285,150
           M310,110 C310,80 360,80 360,110 C360,140 310,140 310,110 Z
           M390,80 C390,140 430,160 460,120
           M485,90 C500,80 520,90 520,110 C520,140 480,135 485,160 C490,180 530,175 550,160"
        stroke="hsl(var(--ink-blue))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* underline flourish */}
      <path
        className={loop ? "signature-path loop" : "signature-path"}
        style={{ animationDelay: "1.2s" }}
        d="M50,175 C160,165 320,170 540,168"
        stroke="hsl(var(--accent))"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
