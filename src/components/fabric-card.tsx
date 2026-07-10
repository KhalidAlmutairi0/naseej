import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Fabric } from "@/lib/types";
import { FabricImage } from "./fabric-image";

// Bound to real fabric columns (sku, description, price, season_tags, image_url).
// `rating` is an optional pre-computed average - the card doesn't fetch per-item ratings.
// Note: the design's heart/"save" action is intentionally omitted - there is no favorites
// table; "saved" is defined (F12) as fabrics the customer rated or contacted.
export function FabricCard({ fabric, rating }: { fabric: Fabric; rating?: number }) {
  return (
    <Link
      to="/fabric/$id"
      params={{ id: fabric.id }}
      className="group block card-elevated overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative">
        <FabricImage src={fabric.image_url} sku={fabric.sku} className="aspect-[4/5] w-full" />
        {fabric.season_tags[0] && (
          <div className="absolute bottom-3 right-3 rounded-full bg-card/85 backdrop-blur-sm px-2 py-1 text-[10px] font-medium ring-1 ring-border">
            {fabric.season_tags[0]}
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-accent">
          {fabric.sku}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-snug line-clamp-1">
          {fabric.description || fabric.sku}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {fabric.price != null ? fabric.price : "-"}{" "}
            <span className="text-[10px] font-medium text-muted-foreground">ر.س</span>
          </span>
          {rating != null && rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3 fill-accent text-accent" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
