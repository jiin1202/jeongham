// 더 싼 대안: 같은 종류 + 핵심 성분(성분표 앞쪽 15번째 안)이 겹치고, 용량 대비 가격이 20% 이상 싼 제품.
// 자극 가능 성분이 원래 제품보다 많아지는 건 빼고, 겹치는 성분이 많은 순 → 싼 순으로 보여준다.
import { keyBenefits, primaryConcern, products, type Product } from "./model";
import type { IngGroup } from "@/data/ingredients";

export const unitPrice = (p: Product) => p.price / Math.max(1, p.volume * p.units);
const core = (p: Product) => new Set(keyBenefits(p).filter((h) => h.pos < 15).map((h) => h.group));

export type Alt = { p: Product; shared: IngGroup[]; save: number };

export function cheaperAlternatives(p: Product, n = 3): Alt[] {
  const mine = core(p);
  if (!mine.size) return [];
  const base = unitPrice(p);
  return products
    .filter((x) => x.id !== p.id && x.category === p.category && x.brand !== p.brand && x.irritation <= p.irritation && x.activeStrong.length <= p.activeStrong.length)
    .map((x) => {
      const shared = Array.from(core(x)).filter((g) => mine.has(g));
      return { p: x, shared, save: 1 - unitPrice(x) / base };
    })
    // 핵심 성분 2개 이상 겹치거나, 원래 제품의 핵심 성분이 1개뿐이면 그 성분 + 대표 고민 + 제형까지 같아야 대안으로 본다
    .filter((a) => a.save >= 0.2 && (a.shared.length >= 2 || (mine.size === 1 && a.shared.length === 1 && a.p.texture === p.texture && primaryConcern(a.p) === primaryConcern(p))))
    .sort((a, b) => b.shared.length - a.shared.length || b.save - a.save)
    .slice(0, n);
}
