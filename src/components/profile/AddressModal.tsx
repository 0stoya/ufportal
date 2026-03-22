"use client";

import { useEffect, useMemo, useState } from "react";
import { X, MapPin, Loader2, Save, AlertCircle, CheckCircle2 } from "lucide-react";

// --- Types ---

type Address = {
  id?: number;
  firstname: string;
  lastname: string;
  street: string[];
  city: string;
  postcode: string;
  country_code: string;
  telephone?: string | null;
  region?: { region?: string | null } | null;
  default_shipping?: boolean | null;
  default_billing?: boolean | null;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: Address | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

// --- Helpers ---

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// --- Main Component ---

export default function AddressModal({ open, mode, initial, onClose, onSaved }: Props) {
  // Reset form state when initial data changes or modal opens
  const seed = useMemo(() => {
    const a = initial ?? null;
    return {
      id: a?.id,
      firstname: a?.firstname ?? "",
      lastname: a?.lastname ?? "",
      street1: a?.street?.[0] ?? "",
      street2: a?.street?.[1] ?? "",
      city: a?.city ?? "",
      postcode: a?.postcode ?? "",
      country_code: (a?.country_code ?? "GB").toUpperCase(),
      telephone: a?.telephone ?? "",
      region: a?.region?.region ?? "",
      default_shipping: !!a?.default_shipping,
      default_billing: !!a?.default_billing,
    };
  }, [initial]);

  const [form, setForm] = useState(seed);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setForm(seed);
      setMsg(null);
    }
  }, [open, seed]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      const endpoint = mode === "create" ? "/api/profile/address/create" : "/api/profile/address/update";
      
      const payload: any = {
        firstname: form.firstname,
        lastname: form.lastname,
        street1: form.street1,
        street2: form.street2 || undefined,
        city: form.city,
        postcode: form.postcode,
        country_code: form.country_code,
        telephone: form.telephone || undefined,
        region: form.region || undefined,
        default_shipping: !!form.default_shipping,
        default_billing: !!form.default_billing,
      };
      
      if (mode === "edit") payload.id = form.id;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      setMsg({ type: "ok", text: "Address saved successfully." });
      await onSaved();
      
      // Short delay to show success message before closing
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Save failed. Please check inputs." });
      setSaving(false); // Only stop saving state on error so we can retry
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {mode === "create" ? "Add New Address" : "Edit Address"}
              </h2>
              <p className="text-sm text-slate-500">
                {mode === "create" ? "Enter delivery details below." : "Update your delivery details."}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6">
          <form id="address-form" onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            
            {msg && (
              <div className={cx(
                "sm:col-span-2 rounded-xl p-4 flex items-center gap-3 text-sm font-medium",
                msg.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"
              )}>
                {msg.type === "ok" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                {msg.text}
              </div>
            )}

            <Input 
              label="First Name" 
              value={form.firstname} 
              onChange={(v) => setForm((s) => ({ ...s, firstname: v }))} 
              required 
            />
            <Input 
              label="Last Name" 
              value={form.lastname} 
              onChange={(v) => setForm((s) => ({ ...s, lastname: v }))} 
              required 
            />

            <Input 
              label="Street Address" 
              value={form.street1} 
              onChange={(v) => setForm((s) => ({ ...s, street1: v }))} 
              className="sm:col-span-2" 
              placeholder="House number and street name"
              required
            />
            <Input 
              label="Street Line 2 (Optional)" 
              value={form.street2} 
              onChange={(v) => setForm((s) => ({ ...s, street2: v }))} 
              className="sm:col-span-2" 
              placeholder="Apartment, suite, unit, etc."
            />

            <Input 
              label="City" 
              value={form.city} 
              onChange={(v) => setForm((s) => ({ ...s, city: v }))} 
              required
            />
            <Input 
              label="Postcode" 
              value={form.postcode} 
              onChange={(v) => setForm((s) => ({ ...s, postcode: v }))} 
              required
            />

            <Input 
              label="Region / County" 
              value={form.region} 
              onChange={(v) => setForm((s) => ({ ...s, region: v }))} 
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
              <select 
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.country_code}
                onChange={(e) => setForm(s => ({ ...s, country_code: e.target.value }))}
              >
                <option value="GB">United Kingdom</option>
                <option value="IE">Ireland</option>
                <option value="US">United States</option>
                {/* Add more as needed */}
              </select>
            </div>

            <Input 
              label="Phone Number" 
              value={form.telephone} 
              onChange={(v) => setForm((s) => ({ ...s, telephone: v }))} 
              className="sm:col-span-2" 
              type="tel"
              required
            />

            <div className="sm:col-span-2 space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={form.default_shipping}
                  onChange={(e) => setForm((s) => ({ ...s, default_shipping: e.target.checked }))}
                />
                <span className="text-sm font-medium text-slate-700">Use as default shipping address</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={form.default_billing}
                  onChange={(e) => setForm((s) => ({ ...s, default_billing: e.target.checked }))}
                />
                <span className="text-sm font-medium text-slate-700">Use as default billing address</span>
              </label>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button 
            type="button" 
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors" 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="address-form"
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Address
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// --- Input Component ---

function Input({
  label,
  value,
  onChange,
  className,
  type = "text",
  placeholder,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className={cx("block", className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-xs text-slate-400 font-normal">Required</span>}
      </div>
      <input
        type={type}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}