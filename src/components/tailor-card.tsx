import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import type { Tailor } from "@/lib/mock-data";

export function TailorCard({
  tailor,
  variant = "row",
}: {
  tailor: Tailor;
  variant?: "row" | "card";
}) {
  if (variant === "card") {
    return (
      <Link
        to="/tailor/$id"
        params={{ id: tailor.id }}
        className="min-w-[240px] card-elevated overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div
          className="h-20 w-full relative"
          style={{
            background: `linear-gradient(135deg, oklch(0.55 0.09 ${tailor.coverHue}), oklch(0.35 0.08 ${tailor.coverHue}))`,
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,0.15) 4px 5px)`,
            }}
          />
        </div>
        <div className="p-4 -mt-8">
          <div
            className="size-14 rounded-2xl grid place-items-center text-primary-foreground font-bold text-lg ring-4 ring-card"
            style={{
              background: `linear-gradient(135deg, oklch(0.5 0.1 ${tailor.logoHue}), oklch(0.32 0.08 ${tailor.logoHue}))`,
            }}
          >
            {tailor.name.charAt(0)}
          </div>
          <h3 className="mt-3 font-semibold text-sm">{tailor.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {tailor.district}، {tailor.city}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs">
              <Star className="size-3 fill-accent text-accent" />
              <span className="font-semibold">{tailor.rating}</span>
              <span className="text-muted-foreground">({tailor.reviewCount})</span>
            </span>
            <span className="text-[10px] text-muted-foreground">{tailor.fabricCount} قماش</span>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      to="/tailor/$id"
      params={{ id: tailor.id }}
      className="flex items-center gap-3 card-elevated p-3 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className="size-14 shrink-0 rounded-2xl grid place-items-center text-primary-foreground font-bold text-lg"
        style={{
          background: `linear-gradient(135deg, oklch(0.5 0.1 ${tailor.logoHue}), oklch(0.32 0.08 ${tailor.logoHue}))`,
        }}
      >
        {tailor.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold">{tailor.name}</h4>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {tailor.district}، {tailor.city}
        </p>
        <div className="mt-1 flex items-center gap-1 text-[11px]">
          <Star className="size-3 fill-accent text-accent" />
          <span className="font-semibold">{tailor.rating}</span>
          <span className="text-muted-foreground">· {tailor.reviewCount} تقييم</span>
        </div>
      </div>
    </Link>
  );
}
