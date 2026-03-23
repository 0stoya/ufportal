"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import type { ShoppingList } from "@/lib/magento/types.shoppingLists";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ListChecks, 
  Loader2, 
  ChevronRight,
  X
} from "lucide-react";

// --- Types ---
type ApiErr = { error?: string };
type ListsResp = { items: ShoppingList[] };
type CreateResp = { item: ShoppingList };
type UpdateResp = { item: ShoppingList };
type DeleteResp = { ok: boolean };

// --- Helpers ---
function isApiErr(v: unknown): v is ApiErr {
  return typeof v === "object" && v !== null && "error" in v;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    if (isApiErr(json) && json?.error) throw new Error(json.error);
    throw new Error(`Request failed (${res.status})`);
  }
  if (isApiErr(json) && json?.error) throw new Error(json.error);
  return json as T;
}

// --- Sub-Component: Rename Modal ---

function RenameDialog({ 
  isOpen, 
  initialValue, 
  onClose, 
  onConfirm, 
  isSubmitting 
}: { 
  isOpen: boolean; 
  initialValue: string; 
  onClose: () => void; 
  onConfirm: (val: string) => void;
  isSubmitting: boolean;
}) {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when modal opens and focus input
  useEffect(() => {
    if (isOpen) {
      setVal(initialValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Rename List</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            List Name
          </label>
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && val.trim()) onConfirm(val);
              if (e.key === "Escape") onClose();
            }}
            className="w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
            placeholder="Enter list name..."
            disabled={isSubmitting}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:ring-2 focus:ring-offset-2 focus:ring-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(val)}
            disabled={isSubmitting || !val.trim() || val === initialValue}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function ListsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ShoppingList[]>([]);
  const [newName, setNewName] = useState("");

  // Track the list currently being renamed { id, currentName }
  const [renamingList, setRenamingList] = useState<{ id: number; name: string } | null>(null);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a.list_name.localeCompare(b.list_name));
  }, [items]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<ListsResp>("/api/shopping-lists");
      setItems(data.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load lists");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createList() {
    const name = newName.trim();
    if (!name) return;

    setError(null);
    setBusyId(-1); 

    try {
      const data = await fetchJson<CreateResp>("/api/shopping-lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setItems((prev) => [data.item, ...prev]);
      setNewName("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create list");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRenameConfirm(newNameInput: string) {
    if (!renamingList) return;
    const { id } = renamingList;
    const next = newNameInput.trim();
    
    if (!next) return;

    setError(null);
    setBusyId(id);

    try {
      const data = await fetchJson<UpdateResp>(`/api/shopping-lists/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      setItems((prev) => prev.map((x) => (x.list_id === id ? data.item : x)));
      setRenamingList(null); // Close modal on success
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to rename list");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteList(listId: number) {
    if (!confirm("Are you sure you want to delete this list?")) return;
    setError(null);
    setBusyId(listId);
    try {
      const data = await fetchJson<DeleteResp>(`/api/shopping-lists/${listId}`, { method: "DELETE" });
      if (!data.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((x) => x.list_id !== listId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete list");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="page-shell relative">
      
      {/* Rename Modal */}
      <RenameDialog 
        isOpen={!!renamingList}
        initialValue={renamingList?.name || ""}
        onClose={() => setRenamingList(null)}
        onConfirm={handleRenameConfirm}
        isSubmitting={busyId === renamingList?.id}
      />

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Shopping Lists</h1>
          <p className="page-subtitle">
            Manage lists for quick reordering.
          </p>
        </div>
        <div className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            {items.length} Lists
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {error}
        </div>
      )}

      {/* Create List Section */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-1 mb-8">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createList()}
            placeholder="Name your new list..."
            className="flex-1 rounded-lg border-0 bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-primary outline-none transition-shadow"
            disabled={busyId === -1}
          />
          <button
            onClick={() => void createList()}
            disabled={busyId === -1 || newName.trim().length === 0}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {busyId === -1 ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Create</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      )}

      {/* Empty State */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl border-dashed">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-4">
            <ListChecks className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No lists found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Create your first shopping list above.
          </p>
        </div>
      )}

      {/* Lists Grid */}
      {!loading && sorted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((l) => {
            const isBusy = busyId === l.list_id;

            return (
              <div 
                key={l.list_id} 
                className={`
                  group relative bg-white border border-slate-200 rounded-xl shadow-sm 
                  hover:border-primary/50 hover:shadow-md transition-all 
                  flex flex-col h-full
                  ${isBusy ? 'opacity-60 pointer-events-none' : ''}
                `}
              >
                <div className="p-5 flex-1">
                  
                  {/* Card Header: Icon + Title + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <ListChecks className="w-5 h-5" />
                      </div>
                      
                      <Link href={`/lists/${l.list_id}`} className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                            {l.list_name}
                        </h3>
                      </Link>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center -mr-2">
                        <button
                          onClick={() => setRenamingList({ id: l.list_id, name: l.list_name })}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void deleteList(l.list_id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>

                  {/* Metadata Badge */}
                  <div className="pl-[52px]">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
                      {l.items_count} items
                    </span>
                  </div>

                </div>

                {/* Footer Button */}
                <div className="p-4 pt-0 mt-auto">
                  <Link
                    href={`/lists/${l.list_id}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white hover:text-primary hover:border-primary/50 transition-all shadow-sm"
                  >
                    View List
                    <ChevronRight className="w-4 h-4 ml-1.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
