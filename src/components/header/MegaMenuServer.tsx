// src/components/header/MegaMenuServer.tsx
import MegaMenu from "./MegaMenu";
import { getNavCategories } from "@/lib/magento/categories";

export default async function MegaMenuServer({ className }: { className?: string }) {
  const categories = await getNavCategories();
  return <MegaMenu categories={categories} className={className} />;
}
