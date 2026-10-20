import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { ProductSection } from '@/types/productSection.type';
import { mediaUrl } from '@/services/http.client';

// ── Preview force type (used by admin preview; storefront leaves undefined) ───
export type PreviewForce = 'mobile' | 'tablet' | 'desktop';

// ── Color preset tokens ───────────────────────────────────────────────────────

type PresetTokens = {
  wrapper: string;
  badge: string;
  title: string;
  desc: string;
  ctaPrimary: string;
  ctaOutline: string;
  overlay?: string;
};

const PRESET: Record<string, PresetTokens> = {
  'dark-premium': {
    wrapper: 'bg-slate-900 text-white',
    badge: 'bg-white/10 text-white/80',
    title: 'text-white',
    desc: 'text-white/70',
    ctaPrimary: 'bg-[#C4480A] text-white hover:bg-[#a83a07] focus-visible:ring-[#C4480A]/50',
    ctaOutline: 'border-2 border-white/60 text-white hover:bg-white/10 focus-visible:ring-white/40',
  },
  'ember-orange': {
    wrapper: 'bg-[#C4480A] text-white',
    badge: 'bg-white/20 text-white',
    title: 'text-white',
    desc: 'text-white/80',
    ctaPrimary: 'bg-white text-[#C4480A] hover:bg-orange-50 focus-visible:ring-white/50',
    ctaOutline: 'border-2 border-white/70 text-white hover:bg-white/10 focus-visible:ring-white/40',
  },
  'light-minimal': {
    wrapper: 'bg-slate-50 text-slate-900',
    badge: 'bg-primary-100 text-primary-700',
    title: 'text-slate-900',
    desc: 'text-slate-600',
    ctaPrimary: 'bg-[#C4480A] text-white hover:bg-[#a83a07] focus-visible:ring-[#C4480A]/50',
    ctaOutline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300',
  },
  'image-background': {
    wrapper: 'text-white relative overflow-hidden',
    badge: 'bg-white/15 text-white/90 backdrop-blur-sm',
    title: 'text-white',
    desc: 'text-white/80',
    ctaPrimary: 'bg-[#C4480A] text-white hover:bg-[#a83a07] focus-visible:ring-[#C4480A]/50',
    ctaOutline: 'border-2 border-white/60 text-white hover:bg-white/10 backdrop-blur-sm focus-visible:ring-white/40',
    overlay: 'absolute inset-0 bg-slate-900/55',
  },
};

// ── CTA Button ────────────────────────────────────────────────────────────────

function CtaButton({
  section, tokens, force,
}: {
  section: ProductSection; tokens: PresetTokens; force: PreviewForce | undefined;
}) {
  if (!section.ctaEnabled || !section.ctaLabel) return null;

  const radius = section.ctaRounded === 'pill' ? 'rounded-full' : 'rounded-xl';
  const colorCls = section.ctaStyle === 'outline' ? tokens.ctaOutline : tokens.ctaPrimary;
  const commonCls = `${radius} ${colorCls} font-bold leading-none shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`;

  // Storefront: responsive via viewport breakpoints
  // Preview: explicit classes based on forced layout
  let sizeCls: string;
  if (!force) {
    sizeCls = 'inline-flex items-center gap-2.5 px-6 py-3.5 text-sm sm:min-w-[220px] sm:justify-center sm:text-base sm:px-8 sm:py-4';
  } else if (force === 'mobile') {
    sizeCls = 'w-full flex items-center justify-center gap-2.5 px-5 py-3.5 text-sm';
  } else {
    sizeCls = 'inline-flex items-center gap-2.5 min-w-[200px] justify-center px-8 py-4 text-base';
  }

  const cls = `${commonCls} ${sizeCls}`;

  const arrowCls = !force
    ? 'h-4 w-4 shrink-0 sm:h-5 sm:w-5'
    : force === 'mobile' ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0';

  const inner = (
    <>
      {section.ctaLabel}
      <ArrowRight className={arrowCls} aria-hidden="true" />
    </>
  );

  if (!section.ctaUrl) return <span className={cls}>{inner}</span>;

  const isExternal = section.ctaUrl.startsWith('http');
  if (isExternal) {
    return (
      <a href={section.ctaUrl} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return <Link href={section.ctaUrl} className={cls}>{inner}</Link>;
}

// ── Text block ────────────────────────────────────────────────────────────────

function TextBlock({
  section, tokens, force,
}: {
  section: ProductSection; tokens: PresetTokens; force: PreviewForce | undefined;
}) {
  const gapCls = !force || force === 'mobile' ? 'gap-2' : 'gap-3';

  const titleCls = !force
    ? `text-xl font-black leading-tight tracking-tight sm:text-2xl lg:text-3xl ${tokens.title}`
    : force === 'mobile'
      ? `text-lg font-black leading-tight tracking-tight ${tokens.title}`
      : force === 'tablet'
        ? `text-xl font-black leading-tight tracking-tight ${tokens.title}`
        : `text-3xl font-black leading-tight tracking-tight ${tokens.title}`;

  const descCls = !force
    ? `text-sm leading-relaxed sm:text-base lg:max-w-lg ${tokens.desc}`
    : `text-sm leading-relaxed ${tokens.desc}`;

  return (
    <div className={`flex min-w-0 flex-col ${gapCls}`}>
      {section.badge && (
        <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${tokens.badge}`}>
          {section.badge}
        </span>
      )}
      <h2 className={titleCls}>
        {section.promoTitle || section.name}
      </h2>
      {section.description && (
        <p className={descCls}>{section.description}</p>
      )}
    </div>
  );
}

// ── Image block ───────────────────────────────────────────────────────────────

function PromoImage({
  section, force,
}: {
  section: ProductSection; force: PreviewForce | undefined;
}) {
  if (!section.imageUrl || section.imagePos === 'none' || section.imagePos === 'background') return null;

  const wrapCls = !force
    ? 'relative h-32 w-full overflow-hidden rounded-xl sm:h-40 lg:h-48 lg:w-72 lg:shrink-0'
    : force === 'mobile'
      ? 'relative h-32 w-full overflow-hidden rounded-xl'
      : force === 'tablet'
        ? 'relative h-40 w-full overflow-hidden rounded-xl shrink-0 sm:w-56'
        : 'relative h-48 w-72 shrink-0 overflow-hidden rounded-xl';

  return (
    <div className={wrapCls}>
      <Image
        src={mediaUrl(section.imageUrl)}
        alt={section.imageAlt || (section.promoTitle || section.name)}
        fill
        sizes="(max-width: 1024px) 100vw, 288px"
        className="object-cover"
        priority={false}
      />
    </div>
  );
}

// ── Layouts ───────────────────────────────────────────────────────────────────

function LayoutTextLeftCtaRight({
  section, tokens, force,
}: {
  section: ProductSection; tokens: PresetTokens; force: PreviewForce | undefined;
}) {
  // Compute wrapper classes
  const wrapCls = !force
    // Storefront: responsive via viewport
    ? 'flex min-h-[140px] flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8 lg:min-h-[160px] lg:gap-10 lg:px-10'
    // Preview: explicit
    : force === 'mobile'
      ? 'flex min-h-[110px] flex-col items-start gap-4 p-5'
      : force === 'tablet'
        ? 'flex min-h-[130px] flex-row items-center gap-6 p-7'
        : 'flex min-h-[160px] flex-row items-center gap-10 px-10 py-8';

  const ctaWrap = !force
    ? 'w-full shrink-0 sm:w-auto'  // storefront: full-width on mobile, natural on sm+
    : force === 'mobile'
      ? 'w-full'                    // preview mobile: full width
      : 'shrink-0';                 // preview tablet/desktop: natural width

  return (
    <div className={wrapCls}>
      <div className="min-w-0 flex-1">
        <TextBlock section={section} tokens={tokens} force={force} />
      </div>
      <div className={ctaWrap}>
        <CtaButton section={section} tokens={tokens} force={force} />
      </div>
    </div>
  );
}

function LayoutImageLeft({
  section, tokens, force,
}: {
  section: ProductSection; tokens: PresetTokens; force: PreviewForce | undefined;
}) {
  const wrapCls = !force
    ? 'flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8'
    : force === 'mobile'
      ? 'flex flex-col gap-4 p-5'
      : force === 'tablet'
        ? 'flex flex-row items-center gap-6 p-7'
        : 'flex flex-row items-center gap-8 p-8';

  const hasImg = section.imageUrl && section.imagePos !== 'none' && section.imagePos !== 'background';

  return (
    <div className={wrapCls}>
      {hasImg && <PromoImage section={section} force={force} />}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <TextBlock section={section} tokens={tokens} force={force} />
        <CtaButton section={section} tokens={tokens} force={force} />
      </div>
    </div>
  );
}

function LayoutImageRight({
  section, tokens, force,
}: {
  section: ProductSection; tokens: PresetTokens; force: PreviewForce | undefined;
}) {
  const wrapCls = !force
    ? 'flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8'
    : force === 'mobile'
      ? 'flex flex-col gap-4 p-5'
      : force === 'tablet'
        ? 'flex flex-row items-center gap-6 p-7'
        : 'flex flex-row items-center gap-8 p-8';

  const hasImg = section.imageUrl && section.imagePos !== 'none' && section.imagePos !== 'background';

  return (
    <div className={wrapCls}>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <TextBlock section={section} tokens={tokens} force={force} />
        <CtaButton section={section} tokens={tokens} force={force} />
      </div>
      {hasImg && <PromoImage section={section} force={force} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PromotionalSection({
  section,
  forceLayout,
}: {
  section: ProductSection;
  forceLayout?: PreviewForce;
}) {
  const tokens = PRESET[section.colorPreset] ?? PRESET['dark-premium'];
  const isImgBg = section.colorPreset === 'image-background' && section.imageUrl;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${tokens.wrapper}`}>
      {/* Background image layer */}
      {isImgBg && (
        <Image
          src={mediaUrl(section.imageUrl!)}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          aria-hidden="true"
        />
      )}
      {/* Overlay */}
      {tokens.overlay && <div className={tokens.overlay} aria-hidden="true" />}

      {/* Content */}
      <div className="relative">
        {section.layout === 'image-left' ? (
          <LayoutImageLeft section={section} tokens={tokens} force={forceLayout} />
        ) : section.layout === 'image-right' ? (
          <LayoutImageRight section={section} tokens={tokens} force={forceLayout} />
        ) : (
          <LayoutTextLeftCtaRight section={section} tokens={tokens} force={forceLayout} />
        )}
      </div>
    </div>
  );
}
