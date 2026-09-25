type LogoProps = { className?: string };

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex font-extrabold ${className}`}>
      <span className="text-bygnor-green">BYG</span>
      <span className="text-bygnor-blue">NOR</span>
    </span>
  );
}
