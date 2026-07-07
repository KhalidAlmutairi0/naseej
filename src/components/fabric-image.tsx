import { useState } from "react";

import { FabricSwatch } from "./fabric-swatch";

export function FabricImage({
  src,
  sku,
  className,
}: {
  src: string | null;
  sku: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <FabricSwatch colorHex="#e8dcc4" className={className} label={sku} />;
  }

  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      <img
        src={src}
        alt={sku}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 block h-full w-full max-w-full object-cover"
      />
    </div>
  );
}
