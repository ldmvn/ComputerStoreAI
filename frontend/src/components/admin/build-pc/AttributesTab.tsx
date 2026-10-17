'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import {
  type AttributeCoverageRow, type MissingAttributeProduct,
  getAttributeCoverage, getMissingAttributeProducts,
} from '@/services/adminBuildPc.service';

export default function AttributesTab() {
  const token = useAuthStore(s => s.token);
  const toast = useToast();

  const [rows, setRows] = useState<AttributeCoverageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [drill, setDrill] = useState<AttributeCoverageRow | null>(null);
  const [products, setProducts] = useState<MissingAttributeProduct[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await getAttributeCoverage(token)); }
    catch { toast.error('Không tải được dữ liệu thuộc tính.'); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void load(); }, [load]);

  async function openDrill(row: AttributeCoverageRow) {
    if (row.missing === 0) return;
    setDrill(row); setDrillLoading(true);
    try {
      const res = await getMissingAttributeProducts(token, row.categorySlug, row.attributeSlug, { limit: 50 });
      setProducts(res.products);
    } catch { toast.error('Không tải được danh sách sản phẩm.'); }
    finally { setDrillLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Các thuộc tính then chốt phục vụ kiểm tra tương thích Build PC. Bấm vào số &quot;Thiếu&quot; để xem danh sách sản phẩm cần bổ sung.</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Thuộc tính</th>
              <th className="px-4 py-3 text-left">Danh mục áp dụng</th>
              <th className="px-4 py-3 text-right">Tổng SP</th>
              <th className="px-4 py-3 text-right">Đã đủ dữ liệu</th>
              <th className="px-4 py-3 text-right">Còn thiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{r.label}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.categorySlug}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.total}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{r.withData}</td>
                <td className="px-4 py-3 text-right">
                  {r.missing > 0 ? (
                    <button onClick={() => openDrill(r)} className="tabular-nums font-semibold text-red-600 underline-offset-2 hover:underline">{r.missing}</button>
                  ) : (
                    <span className="tabular-nums text-slate-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drill && (
        <Modal title={`Sản phẩm thiếu "${drill.label}"`} onClose={() => setDrill(null)}>
          {drillLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Không có sản phẩm nào.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
              {products.map(p => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2">
                  <Package className="h-4 w-4 shrink-0 text-slate-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">{p.name}</p>
                    <p className="text-xs text-slate-400">SKU: {p.sku}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
