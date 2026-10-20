import type { BannerGroup, BannerPosition } from '@/types/banner.type';

export const BANNER_POSITIONS: { position: BannerPosition; group: BannerGroup; label: string }[] = [
  { position: 'MAIN_HERO', group: 'MAIN', label: 'Banner chính giữa (Hero)' },
  { position: 'SIDE_RIGHT_TOP', group: 'SIDE', label: 'Banner phải trên' },
  { position: 'SIDE_RIGHT_BOTTOM', group: 'SIDE', label: 'Banner phải dưới' },
  { position: 'BOTTOM_LEFT', group: 'SIDE', label: 'Banner dưới trái' },
  { position: 'SIDE_RIGHT_MIDDLE', group: 'SIDE', label: 'Banner dưới giữa' },
  { position: 'BOTTOM_RIGHT', group: 'SIDE', label: 'Banner dưới phải' },
  { position: 'SIDE_LEFT', group: 'SIDE', label: 'Banner dọc trái (Không hiển thị ở Storefront)' },
];
export const positionLabel = (position: BannerPosition) => BANNER_POSITIONS.find(item => item.position === position)?.label || position;
export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 50 * 1024 * 1024;
export const AUTO_SIDE_ORDER: BannerPosition[] = ['BOTTOM_LEFT', 'SIDE_RIGHT_MIDDLE', 'BOTTOM_RIGHT', 'SIDE_RIGHT_TOP', 'SIDE_RIGHT_BOTTOM', 'SIDE_LEFT'];

// Layout theo đúng mẫu HACOM:
//   MAIN_HERO: 2:1 trên mobile, 16:7 từ ≥769px
//   RIGHT slots (2 banner dọc bên phải): ~16:11 trên desktop (≥1280px)
//   BOTTOM slots (3 banner ngang dưới): 16:5.5 trên desktop (≥1280px), 8:3 trên tablet (768-1279px)
export function bannerAspectRatio(position: BannerPosition, viewportWidth: number) {
  if (position === 'MAIN_HERO') return viewportWidth >= 769 ? 16 / 7 : 2;
  if (position === 'BOTTOM_LEFT' || position === 'BOTTOM_RIGHT' || position === 'SIDE_RIGHT_MIDDLE') {
    return viewportWidth >= 1280 ? 16 / 5.5 : viewportWidth >= 768 ? 8 / 3 : 16 / 7;
  }
  if (position === 'SIDE_RIGHT_TOP' || position === 'SIDE_RIGHT_BOTTOM') {
    return 16 / 11;
  }
  if (viewportWidth <= 768) return position === 'SIDE_LEFT' ? 3 / 5 : 5 / 3;
  return 16 / 9;
}

export const bannerRecommendation = (position: BannerPosition, ratio: number) => {
  if (position === 'MAIN_HERO')
    return 'Khuyến nghị: 1600 × 700 px (tỉ lệ 16:7, hiển thị từ 769px). Mobile dùng tỉ lệ 2:1 — ảnh sẽ được crop ở giữa.';
  if (position === 'SIDE_RIGHT_TOP' || position === 'SIDE_RIGHT_BOTTOM')
    return 'Khuyến nghị: 600 × 412 px (tỉ lệ ~16:11, 2 banner xếp dọc bên phải). Ảnh được crop ở giữa.';
  if (position === 'BOTTOM_LEFT' || position === 'SIDE_RIGHT_MIDDLE' || position === 'BOTTOM_RIGHT')
    return 'Khuyến nghị: 800 × 275 px (tỉ lệ 16:5.5 desktop, 8:3 tablet, 3 banner ngang dưới Hero). Ảnh được crop ở giữa.';
  return `Kích thước khuyến nghị: 800 × ${Math.round(800 / ratio)} px hoặc cùng tỉ lệ. Media khác tỉ lệ sẽ được crop ở giữa.`;
};
export const dateLabel = (date: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(date));

export function safeBannerTarget(value: string | null) {
  if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { return ['http:', 'https:'].includes(new URL(value).protocol) ? value : null; } catch { return null; }
}

export type BannerDisplayMeta = {
  title: string;
  description: string;
  ctaLabel: string;
  showCta: boolean;
  targetUrl: string | null;
};

export function parseBannerDisplayMeta(banner: {
  name?: string | null;
  altText?: string | null;
  targetUrl?: string | null;
}): BannerDisplayMeta {
  const targetUrl = safeBannerTarget(banner.targetUrl ?? null);
  let title = (banner.name || '').trim();
  if (/^\d+$/.test(title)) {
    title = '';
  }

  let description = '';
  let ctaLabel = '';
  let showCta = false;

  let raw = (banner.altText || '').trim();

  // 1. Kiểm tra cờ SHOW_CTA (Bật/Tắt hiển thị nút CTA trên ảnh)
  if (/\bSHOW_CTA:\s*(1|true)\b/i.test(raw) || /\[SHOW_CTA\]/i.test(raw)) {
    showCta = true;
    raw = raw
      .replace(/\|\|\s*SHOW_CTA:\s*(1|true)\b/gi, '')
      .replace(/\|\s*SHOW_CTA:\s*(1|true)\b/gi, '')
      .replace(/SHOW_CTA:\s*(1|true)\b/gi, '')
      .replace(/\[SHOW_CTA\]/gi, '')
      .trim();
  } else if (/\bSHOW_CTA:\s*(0|false)\b/i.test(raw)) {
    showCta = false;
    raw = raw
      .replace(/\|\|\s*SHOW_CTA:\s*(0|false)\b/gi, '')
      .replace(/\|\s*SHOW_CTA:\s*(0|false)\b/gi, '')
      .replace(/SHOW_CTA:\s*(0|false)\b/gi, '')
      .trim();
  }

  // 2. Tách nhãn CTA và mô tả ngắn
  if (raw.includes('|| CTA:')) {
    const parts = raw.split('|| CTA:');
    description = (parts[0] || '').trim();
    ctaLabel = (parts[1] || '').trim();
  } else if (raw.includes('| CTA:')) {
    const parts = raw.split('| CTA:');
    description = (parts[0] || '').trim();
    ctaLabel = (parts[1] || '').trim();
  } else if (/^CTA:\s*(.+)$/i.test(raw)) {
    ctaLabel = raw.replace(/^CTA:\s*/i, '').trim();
  } else if (!/^\d+$/.test(raw)) {
    description = raw;
  }

  // Làm sạch ký tự phân cách dư
  description = description.replace(/\|\|\s*$/, '').trim();
  ctaLabel = ctaLabel.replace(/\|\|\s*$/, '').trim();

  if (/^\d+$/.test(description)) {
    description = '';
  }

  return { title, description, ctaLabel, showCta, targetUrl };
}

export function formatBannerAltText({
  description,
  ctaLabel,
  showCta,
}: {
  description?: string;
  ctaLabel?: string;
  showCta?: boolean;
}): string {
  const desc = (description || '').trim();
  const cta = (ctaLabel || '').trim();
  const parts: string[] = [];

  if (desc) parts.push(desc);
  if (cta) parts.push(`CTA: ${cta}`);
  if (showCta) {
    parts.push('SHOW_CTA: 1');
  } else if (cta) {
    parts.push('SHOW_CTA: 0');
  }

  return parts.join(' || ');
}
