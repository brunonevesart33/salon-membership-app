"use client";
import { useRouter, useSearchParams } from "next/navigation";
export function StoreSelect({ stores, selected, label }: { stores: { slug: string; name: string }[]; selected?: string; label: string }) { const router = useRouter(); const params = useSearchParams(); return <select id="store" name="store" aria-label={label} defaultValue={selected} onChange={(e) => { const q = new URLSearchParams(params.toString()); q.set("store", e.target.value); router.push(`?${q}`); }}>{stores.map((s) => <option value={s.slug} key={s.slug}>{s.name}</option>)}</select>; }
