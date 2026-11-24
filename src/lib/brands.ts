// 브랜드별 모아보기: 제품 DB의 brand 값 기준
import { products, type Category, type Product } from "./model";

export type BrandInfo = { name: string; count: number; categories: Category[]; forMen: number };

export const brands: BrandInfo[] = (() => {
  const m = new Map<string, Product[]>();
  for (const p of products) m.set(p.brand, [...(m.get(p.brand) ?? []), p]);
  return Array.from(m, ([name, list]) => ({
    name,
    count: list.length,
    categories: Array.from(new Set(list.map((p) => p.category))),
    forMen: list.filter((p) => p.forMen).length,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
})();

export const productsOf = (brand: string) => products.filter((p) => p.brand === brand).sort((a, b) => a.rank - b.rank);
export const brandHref = (brand: string) => `/brands/${encodeURIComponent(brand)}/`;
