'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Edit2, Info, Loader2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/auth.store';
import { getAttributes, type Attribute } from '@/services/attribute.service';
import {
  type CompatibilityRule, type RulesData, type RuleInput,
  getRules, createRule, updateRule, deleteRule,
} from '@/services/adminBuildPc.service';

const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none';
const RULE_TYPE_LABEL: Record<string, string> = {
  ATTR_MATCH: 'Trùng giá trị (ATTR_MATCH)',
  ATTR_SUBSET: 'Tập con (ATTR_SUBSET)',
  ATTR_LTE: 'Nhỏ hơn hoặc bằng (ATTR_LTE)',
};

export default function RulesTab() {
  const token = useAuthStore(s => s.token);
  const toast = useToast();
  const confirm = useConfirm();
  const formId = useId();

  const [data, setData] = useState<RulesData | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<undefined | null | CompatibilityRule>(undefined);
  const [form, setForm] = useState<RuleInput>({ name: '', ruleType: 'ATTR_MATCH', groupAId: 0, attributeASlug: '', groupBId: 0, attributeBSlug: '', severity: 'error', errorMessage: '', isActive: true, sortOrder: 0 });
  const [ferror, setFerror] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, attrs] = await Promise.all([getRules(token), getAttributes(token)]);
      setData(rulesData);
      setAttributes(attrs.attributes ?? attrs);
    } catch { toast.error('Không tải được quy tắc tương thích.'); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setForm({ name: '', ruleType: 'ATTR_MATCH', groupAId: data?.groups[0]?.id ?? 0, attributeASlug: '', groupBId: data?.groups[0]?.id ?? 0, attributeBSlug: '', severity: 'error', errorMessage: '', isActive: true, sortOrder: (data?.rules.length ?? 0) + 1 });
    setFerror('');
    setModal(null);
  }

  function openEdit(r: CompatibilityRule) {
    setForm({
      name: r.name, description: r.description ?? undefined, ruleType: r.ruleType,
      groupAId: r.groupAId, attributeASlug: r.attributeASlug, groupBId: r.groupBId, attributeBSlug: r.attributeBSlug,
      severity: r.config?.severity ?? 'error', errorMessage: r.errorMessage ?? '', isActive: r.isActive, sortOrder: r.sortOrder,
    });
    setFerror('');
    setModal(r);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.groupAId || !form.groupBId || !form.attributeASlug.trim() || !form.attributeBSlug.trim()) {
      setFerror('Vui lòng điền đủ tên, nhóm A/B và thuộc tính A/B.'); return;
    }
    setBusy(true); setFerror('');
    try {
      if (modal === null) { await createRule(token, form); toast.success('Đã tạo quy tắc.'); }
      else if (modal) { await updateRule(token, modal.id, form); toast.success('Đã cập nhật quy tắc.'); }
      setModal(undefined); void load();
    } catch (err) { setFerror(err instanceof Error ? err.message : 'Lỗi.'); }
    finally { setBusy(false); }
  }

  async function remove(r: CompatibilityRule) {
    const yes = await confirm({ title: `Xóa quy tắc "${r.name}"?`, description: 'Hành động này không thể hoàn tác.', confirmLabel: 'Xóa', destructive: true });
    if (!yes) return;
    try { await deleteRule(token, r.id); toast.success('Đã xóa quy tắc.'); void load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Lỗi.'); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  if (!data) return <p className="py-10 text-center text-sm text-slate-400">Không tải được dữ liệu.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{data.rules.length} quy tắc dựa trên thuộc tính sản phẩm (socket, chipset, chiều dài, kích thước...).</p>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Thêm quy tắc
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Tên quy tắc</th>
              <th className="px-4 py-3 text-left">Loại</th>
              <th className="px-4 py-3 text-left">Điều kiện</th>
              <th className="px-4 py-3 text-center">Mức độ</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rules.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{RULE_TYPE_LABEL[r.ruleType] ?? r.ruleType}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {r.groupA?.name ?? '?'}.{r.attributeASlug} ↔ {r.groupB?.name ?? '?'}.{r.attributeBSlug}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.config?.severity === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    {r.config?.severity === 'warning' ? 'Cảnh báo' : 'Lỗi'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.isActive ? 'Bật' : 'Tắt'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(r)} title="Sửa" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(r)} title="Xóa" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Code-based rules — read only */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Quy tắc cố định trong hệ thống (không chỉnh sửa được qua giao diện)</h3>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {data.codeRules.map(c => (
            <li key={c.code} className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span><strong className="font-medium text-slate-700">{c.name}</strong> — áp dụng cho: {c.slots.join(', ')}</span>
            </li>
          ))}
        </ul>
      </div>

      {modal !== undefined && (
        <Modal title={modal === null ? 'Thêm quy tắc tương thích' : 'Chỉnh sửa quy tắc'} onClose={() => setModal(undefined)} busy={busy}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(undefined)} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button>
              <button type="submit" form={formId} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          }>
          <form id={formId} onSubmit={save} className="space-y-3">
            {ferror && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ferror}</p>}
            <label className="block text-sm font-medium">Tên quy tắc *<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></label>
            <label className="block text-sm font-medium">Loại quy tắc
              <select value={form.ruleType} onChange={e => setForm(f => ({ ...f, ruleType: e.target.value }))} className={inputCls}>
                <option value="ATTR_MATCH">Trùng giá trị (ATTR_MATCH)</option>
                <option value="ATTR_SUBSET">Tập con (ATTR_SUBSET)</option>
                <option value="ATTR_LTE">Nhỏ hơn hoặc bằng (ATTR_LTE)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Nhóm A *
                <select value={form.groupAId} onChange={e => setForm(f => ({ ...f, groupAId: Number(e.target.value) }))} className={inputCls}>
                  {data.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Thuộc tính A *
                <input required list={`${formId}-attrs`} value={form.attributeASlug} onChange={e => setForm(f => ({ ...f, attributeASlug: e.target.value }))} className={inputCls} placeholder="vd: socket-cpu" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Nhóm B *
                <select value={form.groupBId} onChange={e => setForm(f => ({ ...f, groupBId: Number(e.target.value) }))} className={inputCls}>
                  {data.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Thuộc tính B *
                <input required list={`${formId}-attrs`} value={form.attributeBSlug} onChange={e => setForm(f => ({ ...f, attributeBSlug: e.target.value }))} className={inputCls} placeholder="vd: socket-cpu" />
              </label>
            </div>
            <datalist id={`${formId}-attrs`}>
              {attributes.map(a => <option key={a.id} value={a.slug}>{a.name}</option>)}
            </datalist>
            <label className="block text-sm font-medium">Thông báo lỗi
              <input value={form.errorMessage} onChange={e => setForm(f => ({ ...f, errorMessage: e.target.value }))} className={inputCls} placeholder="Hiển thị cho khách khi vi phạm" />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm font-medium">Mức độ
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as 'error' | 'warning' }))} className={inputCls}>
                  <option value="error">Lỗi (chặn)</option>
                  <option value="warning">Cảnh báo</option>
                </select>
              </label>
              <label className="block text-sm font-medium">Thứ tự
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className={inputCls} />
              </label>
              <label className="mt-7 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                Kích hoạt
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
