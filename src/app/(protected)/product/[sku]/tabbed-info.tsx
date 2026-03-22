"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, ExternalLink } from "lucide-react";

type CustomAttribute = {
  attribute_metadata?: { code?: string | null; label?: string | null } | null;
  entered_attribute_value?: { value?: string | null } | null;
};

// --- Helper Functions ---
function getAttr(attrs: CustomAttribute[] | null | undefined, code: string) {
  if (!attrs?.length) return null;
  const found = attrs.find((a) => a.attribute_metadata?.code === code);
  const v = found?.entered_attribute_value?.value;
  return v == null || String(v).trim() === "" ? null : String(v);
}

function renderLines(text: string) {
  return text.split(/\r?\n/).map((line, i) => (
    <p key={i} className={i === 0 ? "" : "mt-2 leading-relaxed"}>
      {line}
    </p>
  ));
}

// --- Sub-components ---

function NutRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="group flex items-end justify-between py-3 text-sm hover:bg-slate-50 transition-colors px-2 rounded-lg">
      <span className="font-medium text-slate-700 bg-white/0 pr-2 relative z-10">
        {label}
      </span>
      
      {/* The Dotted Leader Visual */}
      <div className="flex-1 mb-1.5 border-b border-dotted border-slate-300 opacity-30 group-hover:opacity-100 transition-opacity mx-1" />
      
      <span className="font-mono font-semibold text-slate-900 bg-white/0 pl-2 relative z-10">
        {value}
      </span>
    </div>
  );
}

interface TabbedInfoProps {
  sku: string;
  customAttributes?: CustomAttribute[] | null;
}

export default function TabbedInfo({ sku, customAttributes }: TabbedInfoProps) {
  const [activeTab, setActiveTab] = useState<"ingredients" | "nutrition" | "measurements">("ingredients");

  // --- CHANGED HERE: Strip trailing 'u' or 'U' for the filename ---
  const specSheetUrl = useMemo(() => {
    const cleanSku = sku.replace(/u$/i, ""); // Removes 'u' or 'U' from end of string
    return `https://media.thomasridley.co.uk/Products/SPECS/${cleanSku}.pdf`;
  }, [sku]);

  // Prepare data structure
  const data = useMemo(() => {
    const get = (code: string) => getAttr(customAttributes, code);

    return {
      ingredients: get("ingredients"),
      nutrition: {
        kcal: get("cal_100_kcal"),
        kj: get("cal_100_kj"),
        fat: get("fat_100"),
        sat: get("sat_fat_100"),
        carb: get("carb_100"),
        sugar: get("sugar_carb_100"),
        protein: get("protein_100"),
        salt: get("salt_100"),
        fibre: get("fibre_100"),
      },
      measurements: [
        ["units", "Units"],
        ["shelf_life", "Shelf life (days)"],
        ["ean", "EAN"],
        ["pack_size", "Pack size"],
        ["mpn", "MPN"],
        ["TUC", "TUC"],
        ["weight", "Weight"],
        ["preparation", "Preparation"],
        ["data_coshh", "COSHH data"],
      ].map(([code, label]) => ({ code, label, value: get(code) })),
    };
  }, [customAttributes]);

  const tabs = [
    { id: "ingredients", label: "Ingredients" },
    { id: "nutrition", label: "Nutritional Info" },
    { id: "measurements", label: "Measurements & Prep" },
  ] as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      
      {/* Animated Tab Header */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium transition focus-visible:outline-2 outline-sky-500 rounded-lg ${
                activeTab === tab.id ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  style={{ borderRadius: 8 }} 
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* INGREDIENTS TAB */}
        {activeTab === "ingredients" && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-sm text-slate-600"
          >
            {data.ingredients ? (
              <div className="prose prose-sm prose-slate max-w-none">
                {renderLines(data.ingredients)}
              </div>
            ) : (
              <div className="text-slate-400 italic">No ingredients listed.</div>
            )}

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-bold flex items-center gap-2">
                ⚠️ ALWAYS READ THE LABEL
              </div>
              <div className="mt-1 opacity-90">
                Ingredients (including allergens) change. Check the physical packaging before consumption.
              </div>
            </div>
          </motion.div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === "nutrition" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-slate-900">Amount per 100g serving</span>
            </div>
            
            <div className="space-y-1">
              <NutRow
                label="Energy"
                value={
                  data.nutrition.kj || data.nutrition.kcal
                    ? `${data.nutrition.kj ?? "-"} kJ / ${data.nutrition.kcal ?? "-"} kcal`
                    : null
                }
              />
              <NutRow label="Fat" value={data.nutrition.fat ? `${data.nutrition.fat} g` : null} />
              <NutRow label="of which saturates" value={data.nutrition.sat ? `${data.nutrition.sat} g` : null} />
              <NutRow label="Carbohydrate" value={data.nutrition.carb ? `${data.nutrition.carb} g` : null} />
              <NutRow label="of which sugars" value={data.nutrition.sugar ? `${data.nutrition.sugar} g` : null} />
              <NutRow label="Fibre" value={data.nutrition.fibre ? `${data.nutrition.fibre} g` : null} />
              <NutRow label="Protein" value={data.nutrition.protein ? `${data.nutrition.protein} g` : null} />
              <NutRow label="Salt" value={data.nutrition.salt ? `${data.nutrition.salt} g` : null} />
            </div>
          </motion.div>
        )}

        {/* MEASUREMENTS TAB */}
        {activeTab === "measurements" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-100">
                  
                  {/* --- 1. PRODUCT SPEC SHEET (Dynamic based on SKU) --- */}
                  <tr className="group hover:bg-slate-50 transition-colors">
                    <th className="w-1/3 bg-slate-50/50 px-4 py-3 font-semibold text-slate-700">
                      Product Spec Sheet
                    </th>
                    <td className="px-4 py-3">
                      <a 
                        href={specSheetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Download PDF
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    </td>
                  </tr>

                  {/* --- 2. DYNAMIC ATTRIBUTES --- */}
                  {data.measurements
                    .filter((r) => r.value)
                    .map((r) => (
                      <tr key={r.code} className="group hover:bg-slate-50 transition-colors">
                        <th className="w-1/3 bg-slate-50/50 px-4 py-3 font-semibold text-slate-700 group-hover:bg-slate-100/50 transition-colors">
                          {r.label}
                        </th>
                        <td className="px-4 py-3 text-slate-600 font-mono">
                          {r.value}
                        </td>
                      </tr>
                    ))}

                  {/* Empty State */}
                  {data.measurements.every((r) => !r.value) && (
                    <tr>
                      <td className="px-4 py-4 text-center text-slate-400 italic" colSpan={2}>
                        No additional measurements available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}