/**
 * A stylized fabric swatch - soft woven look with subtle diagonal weave lines
 * and a warm sheen, generated from the fabric's color hex.
 */
export function FabricSwatch({
  colorHex,
  className = "",
  label,
}: {
  colorHex: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colorHex} 0%, ${shade(colorHex, -8)} 100%)`,
      }}
    >
      {/* Weave pattern */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-multiply"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent 0 2px, rgba(0,0,0,0.06) 2px 3px), repeating-linear-gradient(-45deg, transparent 0 2px, rgba(0,0,0,0.04) 2px 3px)`,
        }}
      />
      {/* Sheen */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 30% 10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      {/* Fold shadow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(200deg, transparent 40%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0.14) 100%)",
        }}
      />
      {label ? (
        <span className="absolute bottom-2 right-2 text-[10px] font-medium tracking-widest text-black/40 uppercase">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function shade(hex: string, amount: number) {
  const h = hex.replace("#", "");
  const num = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
