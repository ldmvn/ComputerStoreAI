---
name: DUCMANH PC
description: Cửa hàng máy tính tin cậy — chuyên nghiệp, tactile, không loạn.
colors:
  ember-orange: "#C4480A"
  ember-warm: "#f97316"
  ember-pale: "#fff7ed"
  canvas: "#f8fafc"
  surface: "#ffffff"
  surface-raised: "#f1f5f9"
  ink: "#0f172a"
  ink-secondary: "#475569"
  ink-muted: "#94a3b8"
  stroke: "#e2e8f0"
  stroke-strong: "#cbd5e1"
  success: "#16a34a"
  danger: "#dc2626"
  warning: "#d97706"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  page: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ember-orange}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "#c2410c"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "8px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  badge:
    backgroundColor: "{colors.ember-pale}"
    textColor: "{colors.ember-orange}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: DUCMANH PC

## Overview

**Creative North Star: "The Trusted Workshop"**

DUCMANH PC mang ngôn ngữ thiết kế của một xưởng lắp ráp máy tính có tay nghề cao — không phải showroom bóng bẩy, không phải marketplace hỗn loạn. Mỗi trang là một worktop sạch sẽ: đủ ánh sáng để thấy rõ chi tiết, đủ không gian để thao tác, đủ trật tự để tin tưởng. Màu Ember Orange xuất hiện đúng chỗ, không tràn lan — như ngọn lửa hàn, nó thu hút mắt khi cần và nhường sân cho nội dung khi không cần.

Density ở mức comfortable, không chật chội. Mọi element đều có trọng lượng — button phản hồi rõ ràng khi nhấn, card có ranh giới xác định, input gợi cảm giác nhập liệu thực sự. Không có hiệu ứng bay bổng không lý do. Không có countdown timer kêu gọi mua sắm khắp nơi. Đây là nơi người ta tra cứu thông số kỹ thuật, so sánh linh kiện và đặt hàng với sự tự tin — không phải bị dắt mua.

Tông màu nền trắng–xám lạnh (slate scale) tạo nền tảng trung tính như mặt bàn kim loại được đánh bóng. Ember Orange đóng vai trò accent duy nhất — không thêm secondary accent gây loãng. Toàn bộ giao diện hoạt động tốt cả trên màn hình office lẫn màn hình gaming.

**Key Characteristics:**
- Một accent màu duy nhất (Ember Orange) — rarity là điểm mạnh
- Bo góc lớn trên container (16px), vừa trên interaction element (12px)
- Flat theo mặc định, shadow xuất hiện như response to elevation
- Typography thuần Inter — hierarchy qua weight và size, không qua font khác nhau
- Không dark mode áp đảo, không neon, không aggressive gaming aesthetic

## Colors

Palette đơn sắc warmth: một accent nóng trên nền xám lạnh. Sự tương phản nhiệt độ này tạo ra focal point tự nhiên mà không cần animation.

### Primary
- **Ember Orange** (`#C4480A`): Brand accent. Dùng cho CTA chính (button primary, link action), icon trong trạng thái active, badge đếm số (giỏ hàng, thông báo), focus ring (với opacity 20%). Không dùng làm background diện rộng.
- **Ember Warm** (`#f97316`): Gradient pair của Ember Orange. Dùng riêng trong header gradient (`#f97316` → `#C4480A`). Không dùng standalone.
- **Ember Pale** (`#fff7ed`): Hover background cho interactive element, icon container, chip nhẹ. Cặp với Ember Orange text.

### Neutral
- **Canvas** (`#f8fafc`): Background toàn trang. Tone xám lạnh cực nhẹ — không trắng tinh, không lạnh lẽo.
- **Surface** (`#ffffff`): Background card, modal, input. Trắng tinh để nổi bật trên Canvas.
- **Surface Raised** (`#f1f5f9`): Background thứ cấp trong card (table header, code block, tag input area, skeleton).
- **Ink** (`#0f172a`): Primary text. Slate-900 — gần đen nhưng không hoàn toàn đen, tránh độ tương phản cứng nhắc.
- **Ink Secondary** (`#475569`): Secondary text, placeholder label, metadata. Slate-600.
- **Ink Muted** (`#94a3b8`): Placeholder text, disabled state, decorative divider label. Slate-400.
- **Stroke** (`#e2e8f0`): Default border — card, input, divider. Slate-200.
- **Stroke Strong** (`#cbd5e1`): Emphasized border — table row separator, active state ring. Slate-300.

### Semantic
- **Success** (`#16a34a`): Confirmation, delivered status, positive feedback. Luôn dùng với bg-green-50 / text-green-700 để đọc được.
- **Danger** (`#dc2626`): Destructive action, error state, cancellation. Luôn dùng với bg-red-50 / text-red-700.
- **Warning** (`#d97706`): Caution, pending state, low-stock alert. Luôn dùng với bg-amber-50 / text-amber-700.

### Named Rules
**The One Ember Rule.** Ember Orange xuất hiện trên ≤ 10% bất kỳ màn hình nào. Khi mọi nút đều là cam, không nút nào là quan trọng. Rarity của nó là điểm mạnh.

**The Tonal Pair Rule.** Semantic color không bao giờ đứng một mình: luôn dùng cặp tinted background + tinted text (`bg-green-50 + text-green-700`, không phải `bg-green-600 + text-white` — trừ button destructive chính).

## Typography

**Display / Heading / Body / Label Font:** Inter, system-ui, sans-serif  
**Mono Font:** Không dùng — số kỹ thuật dùng `tabular-nums` feature, không phải monospace face.

**Character:** Một typeface — Inter — xử lý toàn bộ scale từ caption đến display. Không có sự đối lập serif/sans hoặc display/body. Hierarchy được tạo hoàn toàn qua weight (400 → 700) và size. Đây là lựa chọn của xưởng thợ: một công cụ tốt dùng thành thạo, không phải nhiều công cụ trung bình.

### Hierarchy
- **Display** (700, 1.5rem/24px, line-height 1.25, tracking -0.01em): Tiêu đề trang lớn, hero headline. Ít dùng — chỉ một display heading mỗi trang.
- **Heading** (600, 1.125rem/18px, line-height 1.4): Section header trong card, modal title, sidebar section. Dùng thoải mái cho cấu trúc trang.
- **Body** (400, 0.875rem/14px, line-height 1.6): Body text mặc định. Tối đa ~65ch để đọc thoải mái.
- **Label** (500, 0.75rem/12px, tracking 0.01em): Button text, chip, badge, table header, form label. Semi-bold để đứng vững trong container nhỏ.
- **Caption** (400, 0.75rem/12px, line-height 1.5): Metadata, timestamp, sub-label, help text. Không in hoa.
- **Uppercase Label** (500, 0.75rem/12px, tracking 0.16em, uppercase): Sidebar section divider, category label trong navigation. Dùng thưa — tối đa 1–2 nơi mỗi trang.

### Named Rules
**The Single Face Rule.** Không import thêm font. Inter xử lý mọi vai trò. Bất kỳ design mới nào thêm font thứ hai đều phá vỡ tính nhất quán của hệ thống.

**The Weight Ladder Rule.** Khi cần hierarchy trong cùng font-size, tăng weight lên một bậc (400→500→600→700), không tăng size. Size reserve cho structural jump.

## Layout

**Grid:** Không dùng grid system cố định. Layout dùng CSS flexbox và CSS grid theo ngữ cảnh. Container max-width 1280px, căn giữa với `mx-auto`.

**Page Padding:** 16px hai bên (12px trên mobile dưới 1024px). Defined trong CSS variable `--page-padding`. Không element nào chạm edge của viewport.

**Header:** 80px trên desktop (64px trên mobile). Fixed/sticky với gradient Ember Warm → Ember Orange.

**Content columns:** 
- Full-width: article, list trang.
- 2-col asymmetric (`minmax(0,1fr) + 360px`): checkout, product detail — main content left, summary/action panel right (sticky top-24).
- Admin grid: sidebar navigation + full-width content area.

**Responsive breakpoints:** sm (640px), lg (1024px), xl (1280px). Tất cả layout collapse sang 1-column dưới lg. Không dùng breakpoint md nhiều — thiết kế mobile→desktop, bỏ qua tablet intermediate.

**Spacing rhythm:** Dùng Tailwind spacing scale. Gap giữa sections trong page: 16–24px (gap-4/gap-6). Padding trong card: 20px (p-5) hoặc 24px (p-6) cho modal. Khoảng cách giữa label và input: 6px.

**Density:** Comfortable — không compact (không phải bảng Excel), không airy (không phải marketing page). Button height 40px, input height 40px. List item min-height 48px trên mobile để touch-friendly.

## Elevation & Depth

Hệ thống này là **flat by default, lifted on interaction**. Bề mặt ở trạng thái tĩnh không có shadow — chúng được phân tách bằng tonal layering (Canvas → Surface → Surface Raised) và border (`--border-color` #e2e8f0). Shadow xuất hiện như response to state: khi element thực sự cần nổi lên trên surface xung quanh.

### Shadow Vocabulary
- **Ambient / Subtle** (`box-shadow: 0 1px 3px rgba(0,0,0,0.08)`): Không dùng standalone — Tailwind `shadow-sm`. Dành cho element inline nhỏ cần tách nhẹ (mini card within card).
- **Dropdown / Popover** (`box-shadow: 0 4px 16px -4px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.06)`): Mega menu panel, dropdown list, mini popover. Tailwind: `shadow-lg shadow-slate-900/10`.
- **Toast** (`box-shadow: 0 8px 24px -12px rgba(15,23,42,0.25)`): Notification toast — cần nổi rõ trên page content nhưng không dominate.
- **Modal / Dialog** (`box-shadow: 0 20px 60px rgba(15,23,42,0.18)`): Modal, confirm dialog, drawer. Cần rõ ràng tách khỏi overlay backdrop.
- **Mobile Drawer** (`box-shadow: Tailwind shadow-2xl + shadow-slate-900/20`): Full-height mobile nav drawer.

### Named Rules
**The Flat-by-Default Rule.** Card ở trạng thái tĩnh không có shadow — chỉ có border `#e2e8f0`. Shadow là signal của interactivity hoặc elevation thực sự (modal, dropdown, toast), không phải trang trí.

**The Structural-Only Rule.** Shadow không dùng để "làm đẹp" — chỉ dùng khi element cần thực sự float trên nội dung khác. Nếu element có thể phân tách bằng border + tonal background, dùng cách đó.

## Shapes

**Hệ thống bo góc hai tầng:**
- **Large radius (16px / rounded-2xl):** Container lớn — card, modal, panel, sidebar section. Cảm giác friendly, không sharp.
- **Medium radius (12px / rounded-xl):** Interaction elements — button, input field, select, badge lớn, mini card. Đủ bo để tactile, đủ góc để professional.
- **Small radius (8px / rounded-lg):** Icon button, close button, tooltip, tag nhỏ. Subtle.
- **Minimal radius (4px / rounded):** Nội phần của element (image trong card, thumbnail). Khi element đã có large radius, inner element dùng small.
- **Full pill (rounded-full):** Badge đếm số, avatar, status dot, filter chip. Không dùng cho button chính — pill button trông như marketing, không như tool.

**Border language:** Stroke #e2e8f0 (1px) là ngôn ngữ phân chia mặc định. Không dùng double border. Không dùng dashed border trừ empty state placeholder (border-dashed border-slate-300).

**Form language:** Tất cả interactive element (button, input, card) dùng cùng border-radius family. Không mix sharp corner với full pill trên cùng một màn hình.

### Named Rules
**The Two-Tier Rule.** Chỉ hai giá trị radius chủ yếu được dùng trên cùng một surface: container dùng lg (16px), element dùng md (12px). Không tự do mix 4 mức radius trong cùng component.

## Components

### Buttons

**Character:** Tactile và confident — button có khối lượng, phản hồi rõ khi hover (color shift), transition 150ms. Không có shadow thường trực, không scale animation.

- **Shape:** Gently curved edges (12px radius / rounded-xl)
- **Primary:** Ember Orange background (#C4480A), white text, height 40px, padding 10px 16px, font-weight 600, text-sm. Hover: #c2410c (primary-700). Focus: outline 2px solid #C4480A + offset 3px.
- **Secondary:** White background, Ink border (#e2e8f0), Ink text (#0f172a). Hover: Surface Raised background (#f1f5f9).
- **Ghost / Icon button:** Transparent, no border, Ink Muted icon. Hover: bg-slate-100. Size 32–40px, square.
- **Destructive:** bg-red-600 text-white. Hover: bg-red-700. Dùng trong confirm dialog, không inline.
- **Disabled:** opacity-40, cursor-not-allowed. Không thay đổi color — transparency preserves brand identity.

### Cards / Containers

- **Corner Style:** Large (16px / rounded-2xl)
- **Background:** Surface white (#ffffff) trên Canvas (#f8fafc)
- **Shadow:** None at rest — border stroke (#e2e8f0) là đủ
- **Border:** 1px solid #e2e8f0
- **Internal Padding:** 20px (p-5) standard; 24px (p-6) cho modal/complex panel

### Inputs / Fields

- **Style:** White background, 1px border #e2e8f0, radius 12px (rounded-xl), padding 10px 14px
- **Placeholder:** Ink Muted (#94a3b8), opacity 1 (explicit)
- **Focus:** border-primary-500 + box-shadow 0 0 0 3px rgba(196,72,10,0.12). Không dùng outline mặc định của browser.
- **Error:** border-red-400, focus ring với red tint
- **Disabled:** bg-slate-50, cursor-not-allowed, text-slate-400

### Badges / Status Chips

- **Style:** rounded-full, border 1px, padding 2px 10px (px-2.5 py-0.5), text-xs, font-medium
- **Color mapping — dùng semantic pairs:**
  - PENDING: bg-amber-50 / text-amber-700 / border-amber-200
  - CONFIRMED: bg-blue-50 / text-blue-700 / border-blue-200
  - SHIPPING: bg-indigo-50 / text-indigo-700 / border-indigo-200
  - DELIVERED: bg-green-50 / text-green-700 / border-green-200
  - CANCELLED: bg-slate-100 / text-slate-600 / border-slate-200
  - Primary accent badge: bg-primary-50 / text-primary-700 / border-primary-200

### Navigation

- **Header style:** Gradient Ember Warm (#f97316) → Ember Orange (#C4480A), height 80px desktop / 64px mobile, fixed at top
- **Nav items:** White text (rgba 0.78 muted), hover: white bg overlay (rgba 15%)
- **Desktop nav:** Horizontal link row với mega-menu dropdown (white panel, shadow-lg)
- **Mobile nav:** Full-height left drawer (width min(82vw,340px)), white bg, slide-in 200ms ease-out
- **Active/hover states:** bg-primary-50 + text-primary-600 trong sidebar và mega menu panel

### Toast / Notification

**Character:** Xuất hiện từ phải (translateX 20px → 0), 220ms ease-out. Tự dismiss sau interval.

- **Container:** rounded-xl, border 1px, padding 14px, shadow toast, width max-content
- **Color mapping:** success (green), error (red), warning (amber), info (sky) — tất cả dùng tinted pair
- **Icon:** 24×24 rounded-full icon container, colored per type
- **Position:** Bottom-right (desktop), bottom-center (mobile)

### Modal / Dialog

- **Container:** rounded-2xl, white bg, shadow-[0_20px_60px_rgba(15,23,42,0.18)], max-h-[90dvh]
- **Backdrop:** semi-transparent black overlay
- **Header:** border-b border-slate-100, px-5 py-4, title text-xl font-semibold
- **Footer:** border-t border-slate-200, px-5 py-4, right-aligned buttons

## Do's and Don'ts

### Do:
- **Do** dùng Ember Orange (`#C4480A`) làm CTA duy nhất — một primary action rõ ràng mỗi màn hình.
- **Do** dùng `shadow-[0_20px_60px_rgba(15,23,42,0.18)]` cho modal và `shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]` cho toast — giữ shadow vocabulary nhất quán.
- **Do** dùng semantic color pairs: bg-[color]-50 / text-[color]-700 / border-[color]-200 cho badge và alert — không dùng solid colored background cho trạng thái.
- **Do** dùng `tabular-nums` font feature cho mọi số tiền, số lượng, và số đếm trong table.
- **Do** dùng `focus-visible:ring-2 focus-visible:ring-primary-500/20` kết hợp với `border-primary-500` cho focus state — không bao giờ `outline: none` mà không thay thế.
- **Do** giữ page padding 16px trên desktop, 12px trên mobile — không element nào touch edge.

### Don't:
- **Don't** dùng Ember Orange làm large background surface — chỉ dùng cho accent element nhỏ. Header gradient là ngoại lệ duy nhất được phép.
- **Don't** dùng `text-slate-500` (Ink Muted) trên colored background (bg-green-50, bg-red-50, bg-amber-50) — dùng tinted text color tương ứng thay thế.
- **Don't** thêm countdown timer, flash sale banner đỏ nổ, hoặc badge "HOT/NEW/SALE" khắp trang — aesthetic của Trusted Workshop không phải marketplace pressure tactics.
- **Don't** dùng `rounded-full` cho primary button — pill button trông như marketing widget, không phải tool của xưởng.
- **Don't** import font bổ sung — Inter là single typeface của hệ thống. Hierarchy qua weight, không qua typeface mới.
- **Don't** dùng shadow trên card ở trạng thái tĩnh — border `#e2e8f0` là đủ; shadow reserve cho modal, dropdown, toast.
