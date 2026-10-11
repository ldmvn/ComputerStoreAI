'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronRight,
  Edit3, Eye, EyeOff, LayoutGrid, PackageOpen, Plus, ShoppingBag, Trash2,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { adminActionButtonClass, adminActionGroupClass } from '@/components/admin/adminActionStyles';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth.store';
import type { ProductSection, ProductSectionInput, SectionProduct } from '@/types/productSection.type';
import { mediaUrl } from '@/services/http.client';
import {
  addProductsToSection,
  createProductSection,
  deleteProductSection,
  getProductSections,
  removeProductFromSection,
  reorderProductSections,
  reorderSectionProducts,
  setProductSectionStatus,
  updateProductSection,
} from '@/services/productSection.service';
import ProductPicker from './ProductPicker';
import ProductSectionForm from './ProductSectionForm';

const btn = adminActionButtonClass;

function sectionVisibility(section: ProductSection) {
  if (!section.isActive) return { label: 'Đang ẩn', cls: 'text-slate-400' };
  if (!section.products.length) return { label: 'Chưa có sản phẩm — không hiển thị', cls: 'text-amber-600' };
  return { label: 'Đang hiển thị trên trang chủ', cls: 'text-green-600' };
}

function ProductRow({
  product, index, total, busy,
  onMoveUp, onMoveDown, onRemove,
}: {
  product: SectionProduct; index: number; total: number; busy: boolean;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) {
  const outOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity === 0;
  const hidden = product.isActive === false;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      {/* rank */}
      <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-slate-400">{index + 1}</span>

      {/* thumbnail */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
        {product.primaryImage ? (
          <img src={mediaUrl(product.primaryImage)} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-slate-300" />
        )}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {product.sku && <span className="font-mono text-[11px] text-slate-400">{product.sku}</span>}
          {hidden && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Đang ẩn</span>}
          {outOfStock && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Hết hàng</span>}
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" disabled={busy || index === 0} onClick={onMoveUp} className={btn} aria-label="Đưa lên"><ArrowUp className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={busy || index === total - 1} onClick={onMoveDown} className={btn} aria-label="Đưa xuống"><ArrowDown className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={busy} onClick={onRemove} className={`${btn} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`} aria-label={`Gỡ ${product.name} khỏi khối`}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export default function ProductSectionManager() {
  const token = useAuthStore(state => state.token);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editor, setEditor] = useState<ProductSection | null | undefined>(undefined);
  const [pickerSectionId, setPickerSectionId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ProductSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const result = await getProductSections(token);
      setSections(result.sections);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được khối sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const action = async (work: () => Promise<unknown>, success: string) => {
    if (!token || busy) return;
    setBusy(true); setError('');
    try { await work(); setMessage(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Thao tác không thành công.'); }
    finally { setBusy(false); }
  };

  const save = (input: ProductSectionInput) => void action(async () => {
    if (editor) await updateProductSection(token!, editor.id, input);
    else await createProductSection(token!, input);
    setEditor(undefined);
  }, editor ? 'Đã cập nhật khối sản phẩm.' : 'Đã tạo khối sản phẩm.');

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const moveSection = (section: ProductSection, direction: -1 | 1) => {
    const idx = sections.findIndex(s => s.id === section.id);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= sections.length) return;
    const ids = sections.map(s => s.id);
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    void action(() => reorderProductSections(token!, ids), 'Đã lưu thứ tự khối.');
  };

  const moveProduct = (section: ProductSection, productId: number, direction: -1 | 1) => {
    const ids = section.products.map(p => p.id);
    const idx = ids.indexOf(productId); const next = idx + direction;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    void action(() => reorderSectionProducts(token!, section.id, ids), 'Đã lưu thứ tự sản phẩm.');
  };

  const pickerSection = pickerSectionId != null ? sections.find(s => s.id === pickerSectionId) ?? null : null;

  if (!token) return null;

  return (
    <section>
      <AdminPageHeader
        title="Khối sản phẩm"
        action={
          <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
            <Plus className="h-4 w-4" />Tạo khối sản phẩm
          </button>
        }
      />
      <AdminFeedback message={message} error={error} />

      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải khối sản phẩm...
        </div>
      ) : !sections.length ? (
        <EmptyState
          icon={LayoutGrid}
          title="Chưa có khối sản phẩm."
          description="Khối sản phẩm là các nhóm hiển thị trên trang chủ."
          action={
            <button type="button" onClick={() => setEditor(null)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Tạo khối sản phẩm
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const isOpen = expanded.has(section.id);
            const vis = sectionVisibility(section);
            return (
              <article key={section.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
                {/* ── Section header ── */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  {/* expand toggle + info */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(section.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? 'Thu gọn khối' : 'Mở rộng khối'}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate font-semibold text-slate-800">{section.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {section.products.length}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${section.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {section.isActive ? 'Active' : 'Ẩn'}
                    </span>
                    <span className={`hidden truncate text-xs sm:block ${vis.cls}`}>{vis.label}</span>
                  </button>

                  {/* action buttons */}
                  <div className={adminActionGroupClass}>
                    <button type="button" className={btn} onClick={() => setEditor(section)} aria-label="Sửa khối">
                      <Edit3 className="h-3.5 w-3.5" />Sửa
                    </button>
                    <button type="button" className={btn} disabled={busy} onClick={() => void action(() => setProductSectionStatus(token!, section.id, !section.isActive), section.isActive ? 'Đã tắt khối.' : 'Đã bật khối.')}>
                      {section.isActive ? <><EyeOff className="h-3.5 w-3.5" />Tắt</> : <><Eye className="h-3.5 w-3.5" />Bật</>}
                    </button>
                    <button type="button" className={`${btn} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`} disabled={busy} onClick={() => setDeleting(section)} aria-label="Xóa khối">
                      <Trash2 className="h-3.5 w-3.5" />Xóa
                    </button>
                    <button type="button" className={btn} disabled={busy || index === 0} onClick={() => moveSection(section, -1)} aria-label="Đưa khối lên">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className={btn} disabled={busy || index === sections.length - 1} onClick={() => moveSection(section, 1)} aria-label="Đưa khối xuống">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Expanded product list ── */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {section.products.length
                          ? `${section.products.length} sản phẩm trong khối`
                          : 'Khối chưa có sản phẩm — sẽ không hiển thị trên trang chủ.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPickerSectionId(section.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                      >
                        <Plus className="h-3.5 w-3.5" />Thêm sản phẩm
                      </button>
                    </div>

                    {!section.products.length ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-6 text-sm text-slate-400">
                        <PackageOpen className="h-5 w-5" />
                        <span>Chưa có sản phẩm</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {section.products.map((product, pIdx) => (
                          <ProductRow
                            key={product.id}
                            product={product}
                            index={pIdx}
                            total={section.products.length}
                            busy={busy}
                            onMoveUp={() => moveProduct(section, product.id, -1)}
                            onMoveDown={() => moveProduct(section, product.id, 1)}
                            onRemove={() => void action(
                              () => removeProductFromSection(token!, section.id, product.id),
                              'Đã gỡ sản phẩm khỏi khối.',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editor !== undefined && (
        <ProductSectionForm section={editor || undefined} busy={busy} onClose={() => setEditor(undefined)} onSave={save} />
      )}

      {pickerSection && (
        <ProductPicker
          token={token}
          existingIds={pickerSection.products.map(p => p.id)}
          busy={busy}
          onClose={() => setPickerSectionId(null)}
          onAdd={ids => void action(async () => {
            await addProductsToSection(token!, pickerSection.id, ids);
            setPickerSectionId(null);
          }, 'Đã thêm sản phẩm vào khối.')}
        />
      )}

      {deleting && (
        <Modal title="Xóa khối sản phẩm" onClose={() => setDeleting(null)} busy={busy}>
          <p className="text-slate-600">
            Xóa khối <strong>"{deleting.name}"</strong>? Các sản phẩm trong khối sẽ không bị xóa khỏi cơ sở dữ liệu.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleting(null)} disabled={busy} className="ui-button ui-button--neutral rounded-lg border border-slate-200 px-4 py-2.5 text-sm">Hủy</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void action(async () => { await deleteProductSection(token!, deleting.id); setDeleting(null); }, 'Đã xóa khối sản phẩm.')}
              className="ui-button ui-button--danger rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Đang xóa...' : 'Xóa khối'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
