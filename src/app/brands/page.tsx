import type { Metadata } from "next";
import BrandList from "./BrandList";
import { brands } from "@/lib/brands";
import { products } from "@/lib/model";
import { PX_BRANDS } from "@/data/px";

export const metadata: Metadata = { title: "브랜드별로 보기 | 정함", description: "닥터지, 라운드랩, 아누아 등 브랜드별로 제품을 모아 전성분과 정가를 비교해요." };

export default function BrandsPage() {
  return (
    <div className="page pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">브랜드별로 보기</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-steel">
        브랜드 {brands.length}곳, 제품 {products.length}개예요. 쓰고 있는 브랜드를 누르면 그 브랜드 제품을 종류별로 모아 보여드려요.
      </p>
      <BrandList brands={brands.map((b) => ({ name: b.name, count: b.count, px: PX_BRANDS.has(b.name) }))} />
    </div>
  );
}
