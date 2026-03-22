"use client";

import Image from "next/image";
import { getAttrValue } from "@/lib/magento/attributes";
import type { CustomAttribute } from "@/lib/magento/types";

// Map Magento Attribute Code -> Filename Base (e.g. 'celery')
const ALLERGEN_MAP: Record<string, { label: string; file: string }> = {
  allergens_celery: { label: "Celery", file: "celery" },
  allergens_ccg: { label: "Gluten (Cereals)", file: "wheat" }, // Mapped CCG to wheat icon
  allergens_crustaceans: { label: "Crustaceans", file: "crustaceans" },
  allergens_eggs: { label: "Eggs", file: "eggs" },
  allergens_fish: { label: "Fish", file: "fish" },
  allergens_lupin: { label: "Lupin", file: "lupin" },
  allergens_milk: { label: "Milk", file: "milk" },
  allergens_molluscs: { label: "Molluscs", file: "molluscs" },
  allergens_mustard: { label: "Mustard", file: "mustard" },
  allergens_peanuts: { label: "Peanuts", file: "peanut" }, // Note: file is singular 'peanut'
  allergens_sdas: { label: "Sulphur Dioxide", file: "sulphurdioxide" },
  allergens_sesame_seeds: { label: "Sesame", file: "sesame" },
  allergens_soybeans: { label: "Soya", file: "soya" },
  allergens_tree_nuts: { label: "Tree Nuts", file: "treenut" },
};

type AllergenStatus = "contains" | "may_contain" | "free_from" | null;

export default function AllergenIcons({ customAttributes }: { customAttributes?: CustomAttribute[] | null }) {
  const detected: Array<{ label: string; src: string; tone: string }> = [];

  Object.entries(ALLERGEN_MAP).forEach(([code, config]) => {
    const raw = getAttrValue(customAttributes, code);
    if (!raw) return;

    const val = raw.toLowerCase();
    let suffix = "";
    let tone = "neutral";

    // Logic to determine which icon suffix to use
    if (val === "contains" || val === "does contain") {
      suffix = "_red";
      tone = "Contains";
    } else if (val === "may contain" || val === "maycontain") {
      suffix = "_amber";
      tone = "May Contain";
    } else if (val === "free from" || val === "no") {
      // Optional: If you want to show green/base icons for "Free From"
      // suffix = ""; 
      // tone = "Free From";
      return; // Skip rendering if we only want to show risks
    } else {
      return;
    }

    detected.push({
      label: config.label,
      src: `/allergens/${config.file}${suffix}.svg`,
      tone,
    });
  });

  if (detected.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-900">
        Allergen Information
      </h3>
      
      <div className="flex flex-wrap gap-4">
        {detected.map((item) => (
          <div 
            key={item.label} 
            className="group relative flex flex-col items-center gap-2"
            title={`${item.tone} ${item.label}`}
          >
            <div className="relative h-12 w-12 transition-transform hover:scale-110">
              <Image
                src={item.src}
                alt={`${item.tone} ${item.label}`}
                fill
                className="object-contain"
                unoptimized // SVGs usually don't need optimization
              />
            </div>
            <span className="text-[10px] font-medium text-slate-600 max-w-[60px] text-center leading-tight">
              {item.label}
            </span>
            
            {/* Optional: Status Badge Overlay */}
            {item.tone === "Contains" && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white" />
            )}
            {item.tone === "May Contain" && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600" /> Contains
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> May Contain
        </div>
      </div>
    </div>
  );
}