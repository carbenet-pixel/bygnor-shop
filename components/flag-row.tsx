// Alfabetisk orden: Dansk, Færøsk, Grønlandsk.
const FLAGS = [
  { code: "dk", label: "Dansk" },
  { code: "fo", label: "Færøsk" },
  { code: "gl", label: "Grønlandsk" },
];

type FlagRowProps = {
  className?: string;
  /** Samlet bredde i px; flagene deler den ligeligt (minus gaps). */
  width?: number;
  /** Gap i px mellem flagene. Default 2. */
  gap?: number;
};

export function FlagRow({ className = "", width, gap = 2 }: FlagRowProps) {
  const flagWidth = width !== undefined ? (width - gap * (FLAGS.length - 1)) / FLAGS.length : undefined;

  return (
    <div className={`flex ${className}`} style={{ width, gap }}>
      {FLAGS.map((flag) => (
        <img
          key={flag.code}
          src={`/flags/${flag.code}.svg`}
          alt={flag.label}
          title={flag.label}
          style={flagWidth !== undefined ? { width: flagWidth } : undefined}
          className="block"
        />
      ))}
    </div>
  );
}
