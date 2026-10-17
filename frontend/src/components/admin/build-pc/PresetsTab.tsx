'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { AlertTriangle, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/auth.store';
import { formatProductPrice } from '@/lib/product';
import {
  type Preset, type PresetInput, type BuildPcGroupRef,
  getPresets, createPreset, updatePreset, deletePreset, getRules,
} from '@/services/adminBuildPc.service';

const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none';

export default function PresetsTab() {
  const token = useAuthStore(s => s.token);
  const toast = useToast();
  const confirm = useConfirm();
  const formId = useId();

  const [presets, setPresets] = useState<Preset[]>([]);
  const [groups, setGroups] = useState<BuildPcGroupRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<undefined | null | Preset>(undefined);
  const [form, setForm] = useState<PresetInput>({ name: '', description: '', useCase: '', budgetMin: undefined, budgetMax: undefined, isActive: true, sortOrder: 0, items: [] });
  const [ferror, setFerror] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([getPresets(token), getRules(token)]);
      setPresets(p); setGroups(r.groups);
    } catch { toast.error('Không tải được cấu hình mẫu.'); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setForm({ name: '', description: '', useCase: '', budgetMin: undefined, budgetMax: undefined, isActive: true, sortOrder: presets.length + 1, items: [] });
    setFerror(''); setModal(null);
  }

  function openEdit(p: Preset) {
    setForm({
      name: p.name, description: p.description ?? '', useCase: p.useCase ?? '',
      budgetMin: p.budgetMin ?? undefined, budgetMax: p.budgetMax ?? undefined,
      isActive: p.isActive, sortOrder: p.sortOrder,
      items: p.items.map(i => ({ groupId: i.groupId, productId: i.productId })),
    });
    setFerror(''); setModal(p);
  }

  function setItemProductId(groupId: number, value: string) {
    setForm(f => {
      const items = (f.items ?? []).filter(i => i.groupId !== groupId);
      if (value) items.push({ groupId, productId: Number(value) });
      return { ...f, items };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFerror('Tên preset là bắt buộc.'); return; }
    setBusy(true); setFerror('');
    try {
      if (modal === null) { await createPreset(token, form); toast.success('Đã tạo cấu hình mẫu.'); }
      else if (modal) { await updatePreset(token, modal.id, form); toast.success('Đã cập nhật cấu hình mẫu.'); }
      setModal(undefined); void load();
    } catch (err) { setFerror(err instanceof Error ? err.message : 'Lỗi.'); }
    finally { setBusy(false); }
  }

  async function remove(p: Preset) {
    const yes = await confirm({ title: `Xóa cấu hình mẫu "${p.name}"?`, description: 'Hành động này không thể hoàn tác.', confirmLabel: 'Xóa', destructive: true });
    if (!yes) return;
    try { await deletePreset(token, p.id); toast.success('Đã xóa cấu hình mẫu.'); void load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Lỗi.'); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Preset chỉ là gợi ý tham khảo, không ảnh hưởng tới việc khách hàng tự chọn linh kiện.</p>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Thêm preset
        </button>
      </div>

      {presets.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">Chưa có cấu hình mẫu nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map(p => {
            const hiddenCount = p.items.filter(i => i.product && (!i.product.isActive || i.product.isDeleted)).length;
            const total = p.items.reduce((s, i) => s + (i.product?.price ?? 0), 0);
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{p.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.isActive ? 'Bật' : 'Tắt'}</span>
                </div>
                {p.description && <p className="mb-2 text-xs text-slate-500">{p.description}</p>}
                <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
                  {p.useCase && <span className="rounded-full bg-slate-100 px-2 py-0.5">{p.useCase}</span>}
                  {(p.budgetMin || p.budgetMax) && <span className="rounded-full bg-slate-100 px-2 py-0.5">{p.budgetMin ? formatProductPrice(p.budgetMin) : '0đ'} - {p.budgetMax ? formatProductPrice(p.budgetMax) : '∞'}</span>}
                </div>
                <p className="mb-3 text-sm text-slate-600">{p.items.length} linh kiện · {formatProductPrice(total)}</p>
                {hiddenCount > 0 && (
                  <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {hiddenCount} sản phẩm đã ẩn/xóa</p>
                )}
                <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                  <button onClick={() => openEdit(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(p)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== undefined && (
        <Modal title={modal === null ? 'Thêm cấu hình mẫu' : 'Chỉnh sửa cấu hình mẫu'} onClose={() => setModal(undefined)} busy={busy} size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(undefined)} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button>
              <button type="submit" form={formId} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          }>
          <form id={formId} onSubmit={save} className="space-y-3">
            {ferror && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ferror}</p>}
            <label className="block text-sm font-medium">Tên preset *<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></label>
            <label className="block text-sm font-medium">Mô tả<textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} rows={2} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Nhu cầu sử dụng<input value={form.useCase} onChange={e => setForm(f => ({ ...f, useCase: e.target.value }))} placeholder="vd: Gaming, Đồ họa..." className={inputCls} /></label>
              <label className="block text-sm font-medium">Thứ tự<input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className={inputCls} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Ngân sách từ<input type="number" value={form.budgetMin ?? ''} onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} /></label>
              <label className="block text-sm font-medium">Ngân sách đến<input type="number" value={form.budgetMax ?? ''} onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" /> Kích hoạt
            </label>

            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-sm font-medium text-slate-700">Linh kiện gợi ý theo nhóm (nhập Product ID, để trống nếu không gợi ý cụ thể)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {groups.map(g => {
                  const current = form.items?.find(i => i.groupId === g.id);
                  return (
                    <label key={g.id} className="block text-xs font-medium text-slate-600">
                      {g.name}
                      <input
                        type="number" placeholder="Product ID"
                        value={current?.productId ?? ''}
                        onChange={e => setItemProductId(g.id, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-primary-400 focus:outline-none"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
