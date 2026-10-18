'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PackageX } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { formatProductPrice } from '@/lib/product';
import {
  type BuildSession, type BuildSessionDetail,
  getBuildSessions, getBuildSessionDetail,
} from '@/services/adminBuildPc.service';

function dateFmt(s: string) {
  return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SessionsTab() {
  const token = useAuthStore(s => s.token);
  const toast = useToast();

  const [sessions, setSessions] = useState<BuildSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'unavailable'>('all');

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BuildSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const limit = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getBuildSessions(token, {
        page: p, limit,
        from: from || undefined, to: to || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      });
      let list = res.sessions;
      if (statusFilter === 'ok') list = list.filter(s => !s.hasUnavailableItems);
      if (statusFilter === 'unavailable') list = list.filter(s => s.hasUnavailableItems);
      setSessions(list); setTotal(res.total); setPage(p);
    } catch { toast.error('Không tải được lịch sử cấu hình.'); }
    finally { setLoading(false); }
  }, [token, from, to, minPrice, maxPrice, statusFilter, toast]);

  useEffect(() => { void load(1); }, [load]);

  async function openDetail(id: number) {
    setDetailId(id); setDetailLoading(true); setDetail(null);
    try { setDetail(await getBuildSessionDetail(token, id)); }
    catch { toast.error('Không tải được chi tiết cấu hình.'); }
    finally { setDetailLoading(false); }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">Từ ngày</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 h-9 rounded-lg border border-slate-200 px-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Đến ngày</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 h-9 rounded-lg border border-slate-200 px-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Giá từ</label>
          <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="mt-1 h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Giá đến</label>
          <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="mt-1 h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Trạng thái</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="mt-1 h-9 rounded-lg border border-slate-200 px-2 text-sm">
            <option value="all">Tất cả</option>
            <option value="ok">Linh kiện còn bán</option>
            <option value="unavailable">Có linh kiện ngừng bán</option>
          </select>
        </div>
        <button onClick={() => load(1)} className="h-9 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">Lọc</button>
        {total > 0 && <span className="ml-auto self-center text-xs text-slate-400">{total} cấu hình</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : sessions.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">Không có cấu hình nào khớp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Mã cấu hình</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-right">Linh kiện</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{s.shareCode}</td>
                  <td className="px-4 py-3 text-slate-600">{s.user?.fullName ?? 'Khách vãng lai'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatProductPrice(s.total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{s.itemCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{dateFmt(s.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    {s.hasUnavailableItems ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"><AlertTriangle className="h-3 w-3" /> Có SP ngừng bán</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Bình thường</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(s.id)} className="text-xs font-medium text-primary-600 hover:underline">Xem</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)} className={`rounded-md px-3 py-1.5 text-sm ${p === page ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      )}

      {detailId !== null && (
        <Modal title={`Chi tiết cấu hình ${detail?.shareCode ?? ''}`} onClose={() => setDetailId(null)} size="lg">
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-slate-400">User</p><p className="font-medium text-slate-700">{detail.user?.fullName ?? 'Khách vãng lai'}</p></div>
                <div><p className="text-xs text-slate-400">Ngày tạo</p><p className="font-medium text-slate-700">{dateFmt(detail.createdAt)}</p></div>
                <div><p className="text-xs text-slate-400">Tổng tiền</p><p className="font-semibold text-primary-700">{formatProductPrice(detail.total)}</p></div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr><th className="px-3 py-2 text-left">Nhóm</th><th className="px-3 py-2 text-left">Sản phẩm</th><th className="px-3 py-2 text-right">SL</th><th className="px-3 py-2 text-right">Giá</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.items.map((it, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-slate-500">{it.groupName}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {it.product.name}
                          {(!it.product.isActive || it.product.isDeleted) && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] text-red-600"><PackageX className="h-3 w-3" />Ngừng bán</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatProductPrice(it.product.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(detail.compatibility.issues.length > 0 || detail.compatibility.missing.length > 0) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-800">Cảnh báo tương thích</p>
                  <ul className="space-y-1 text-xs text-amber-700">
                    {detail.compatibility.issues.map((iss, i) => <li key={`i${i}`}>• {iss.message}</li>)}
                    {detail.compatibility.missing.map((m, i) => <li key={`m${i}`}>• {m.message}</li>)}
                  </ul>
                </div>
              )}
              {detail.compatibility.issues.length === 0 && detail.compatibility.missing.length === 0 && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Không có cảnh báo tương thích.</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
