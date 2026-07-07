import { Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

const suggestions = [
  "قماش صيفي أبيض ما يكش",
  "شتوي فاخر للمناسبات",
  "قطن ياباني للدوام",
  "كتان طبيعي كاجوال",
];

export function AIPromptBox({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  const submit = (q?: string) => {
    const query = q ?? value;
    navigate({ to: "/search", search: { q: query } });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-2xl ${
        compact ? "p-5" : "p-6"
      }`}
    >
      <div className="absolute -left-16 -bottom-16 size-56 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-accent">
          <Search className="size-4" />
          <span className="text-[11px] font-semibold uppercase tracking-widest">ابحث عن قماشك</span>
        </div>
        <h2 className={`mt-2 font-bold leading-snug ${compact ? "text-lg" : "text-2xl"}`}>
          اكتب اللي في بالك
        </h2>
        {!compact && (
          <p className="mt-1 text-sm text-primary-foreground/70">اكتب وصف القماش وخلنا نلقاه لك</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-5 flex items-center gap-2 rounded-2xl bg-primary-foreground/10 p-1.5 ring-1 ring-primary-foreground/15 backdrop-blur"
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="أبي قماش صيفي أبيض ما يكش..."
            className="flex-1 bg-transparent px-3 py-2.5 text-sm placeholder:text-primary-foreground/40 focus:outline-none"
          />
          <button
            type="submit"
            className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20 transition hover:scale-105"
            aria-label="ابحث"
          >
            <ArrowLeft className="size-4" />
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-[11px] font-medium text-primary-foreground/80 transition hover:bg-primary-foreground/10"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
