'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { SectionProduct } from '@/types/productSection.type';
import { searchSectionProducts } from '@/services/productSection.service';

export default function ProductPicker({ token, existingIds, busy, onClose, onAdd }: {
  token: string | null;
  existingIds: number[];
  busy: boolean;
  onClose: () => void;
  onAdd: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<SectionProduct[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    searchSectionProducts(token, search, controller.signal).then(result => setProducts(result.products)).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, token]);

  const toggle = (id: number) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  return <Modal title="Thêm sản phẩm vào khối" onClose={onClose} busy={busy}>
    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder="Tìm theo tên sản phẩm..." /></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
      {loading ? <p className="p-4 text-sm text-slate-500">Đang tải sản phẩm...</p> : products.length ? products.map(product => {
        const inSection = existingIds.includes(product.id);
        return <label key={product.id} className={`flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-0 ${inSection ? 'bg-slate-50 opacity-60' : 'hover:bg-primary-50'}`}><input type="checkbox" disabled={inSection} checked={inSection || selected.includes(product.id)} onChange={() => toggle(product.id)} className="h-4 w-4" /><span className="min-w-0 flex-1 truncate text-sm text-slate-700">{product.name}</span><span className="text-sm font-semibold text-slate-600">{product.price.toLocaleString('vi-VN')}đ</span></label>;
      }) : <p className="p-4 text-sm text-slate-500">Không tìm thấy sản phẩm.</p>}
    </div>
    <div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm text-slate-500">Đã chọn {selected.length} sản phẩm</span><button type="button" disabled={busy || !selected.length} onClick={() => onAdd(selected)} className="ui-button ui-button--primary rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang thêm...' : 'Thêm vào khối'}</button></div>
  </Modal>;
}
