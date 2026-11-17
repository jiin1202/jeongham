import type { MetadataRoute } from "next";
import { products } from "@/lib/model";
import { guides } from "@/data/guides";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/check/", "/products/", "/mine/", "/guide/", "/standard/"].map((p) => ({ url: `${base}${p || "/"}`, changeFrequency: "weekly" as const }));
  return [
    ...pages,
    ...guides.map((g) => ({ url: `${base}/guide/${g.slug}/`, changeFrequency: "monthly" as const })),
    ...products.map((p) => ({ url: `${base}/p/${p.id}/`, changeFrequency: "weekly" as const })),
  ];
}
