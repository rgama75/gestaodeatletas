import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/store";

export function StoredImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    signedUrl(path).then((u) => live && setUrl(u)).catch(() => live && setUrl(null));
    return () => { live = false; };
  }, [path]);
  if (!url) return <div className={`${className ?? ""} animate-pulse bg-secondary`} aria-label={alt} />;
  return <img src={url} alt={alt} className={className} />;
}