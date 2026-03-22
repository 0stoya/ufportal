import type { CustomAttribute } from "@/lib/magento/types"; // adjust path if needed

export function getAttrValue(attrs: CustomAttribute[] | null | undefined, code: string): string | null {
  if (!attrs?.length) return null;

  const attr = attrs.find((a) => a.attribute_metadata?.code === code);
  if (!attr) return null;

  // 1) option labels (dropdowns) – this is your allergens case
  const optLabel = attr.selected_attribute_options?.attribute_option?.[0]?.label;
  if (optLabel && String(optLabel).trim()) return String(optLabel).trim();

  // 2) entered values (text / numbers)
  const v = attr.entered_attribute_value?.value;
  if (v == null) return null;

  const s = String(v).trim();
  return s ? s : null;
}
