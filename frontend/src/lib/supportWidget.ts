import { mediaUrl } from '@/services/http.client';

// Single source of truth for how raw `widget.*` / `social.*` StoreSettings
// resolve into the Floating Support Widget's displayed content. Shared by the
// Storefront widget and the Dashboard live preview so they never drift.

export const WIDGET_CHANNEL_IDS = ['ai', 'zalo', 'messenger', 'telegram'] as const;
export type WidgetChannelId = (typeof WIDGET_CHANNEL_IDS)[number];

export const WIDGET_DEFAULTS: Record<WidgetChannelId, { name: string; description: string }> = {
  ai: { name: 'Chatbot AI', description: 'Hỏi đáp nhanh 24/7' },
  zalo: { name: 'Zalo', description: 'Tư vấn trực tiếp' },
  messenger: { name: 'Messenger', description: 'Chat với nhân viên' },
  telegram: { name: 'Telegram', description: 'Nhận hỗ trợ nhanh' },
};

export const DEFAULT_POPUP_TITLE = 'Liên hệ hỗ trợ';
export const DEFAULT_POPUP_DESCRIPTION = 'Chúng tôi luôn sẵn sàng 24/7';

export type ResolvedWidgetChannel = {
  id: WidgetChannelId;
  name: string;
  description: string;
  enabled: boolean;
  /** '' means: use the built-in brand glyph (Zalo/Messenger/Telegram) or mascot avatar (ai). */
  logoUrl: string;
  /** external contact link — undefined for 'ai' */
  href?: string;
};

export type ResolvedWidgetConfig = {
  popupTitle: string;
  popupDescription: string;
  order: WidgetChannelId[];
  channels: Record<WidgetChannelId, ResolvedWidgetChannel>;
  /** '' means: use the same mascot avatar as the Chatbot AI card. */
  toggleAvatarUrl: string;
};

// ── Social URL validation (mirrors backend SOCIAL_HOSTNAMES in storeSetting.controller.js) ──

export const SOCIAL_HOSTNAMES: Record<string, string[]> = {
  zalo: ['zalo.me'],
  messenger: ['m.me', 'www.messenger.com', 'messenger.com'],
  telegram: ['t.me', 'telegram.me', 'telegram.org'],
};

export function validateSocialUrl(channel: string, v: string): string | null {
  if (!v) return null;
  let parsed: URL;
  try { parsed = new URL(v); } catch { return 'URL không hợp lệ.'; }
  if (parsed.protocol !== 'https:') return 'Chỉ chấp nhận https://.';
  if (parsed.username || parsed.password) return 'URL không được chứa thông tin đăng nhập.';
  const allowed = SOCIAL_HOSTNAMES[channel] ?? [];
  if (!allowed.includes(parsed.hostname)) return `Domain phải là: ${allowed.join(', ')}.`;
  return null;
}

// ── Widget text-field validation (mirrors backend validateWidgetKey) ─────────

export function validateWidgetName(v: string): string | null {
  if (v.length > 40) return 'Tối đa 40 ký tự.';
  if (/[<>]/.test(v)) return 'Không được chứa ký tự < hoặc >.';
  return null;
}

export function validateWidgetDescription(v: string, max = 80): string | null {
  if (v.length > max) return `Tối đa ${max} ký tự.`;
  if (/[<>]/.test(v)) return 'Không được chứa ký tự < hoặc >.';
  return null;
}

function resolveMediaUrl(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (v.startsWith('http') || v.startsWith('data:')) return v;
  return mediaUrl(v);
}

// Used only when the settings fetch itself fails (not while it's still in
// flight). resolveWidgetConfig({}) resolves every channel's `enabled` to its
// *default* of true — correct while loading, but wrong here: if the request
// failed after an admin had disabled a channel, defaulting to "all enabled"
// would resurrect it on the Storefront. Forcing every channel off is the one
// fallback that can never show a channel the admin may have turned off.
export function resolveWidgetConfigOnFetchError(): ResolvedWidgetConfig {
  return resolveWidgetConfig({
    'widget.ai.enabled': 'false',
    'social.zalo.enabled': 'false',
    'social.messenger.enabled': 'false',
    'social.telegram.enabled': 'false',
  });
}

// Comma-separated string of the 4 channel ids, any order → a complete,
// de-duplicated WidgetChannelId[]. Falls back to the default order for
// anything malformed (missing/duplicate/unknown id, empty, wrong type) —
// used both for display (here, in the preview) and for building the Save
// payload, so what's shown always matches what gets sent.
export function normalizeWidgetOrder(raw: string | undefined): WidgetChannelId[] {
  if (typeof raw !== 'string') return [...WIDGET_CHANNEL_IDS];
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length === WIDGET_CHANNEL_IDS.length && WIDGET_CHANNEL_IDS.every(id => ids.includes(id))) {
    return ids as WidgetChannelId[];
  }
  return [...WIDGET_CHANNEL_IDS];
}

// 'false' is the only value that means "off"; anything else (unset, '',
// 'true', a stray value) means "on" — mirrors resolveWidgetConfig's own
// `settings[key] !== 'false'` reading, so what the toggle displays is
// always exactly what gets persisted, whether or not the admin touched it.
export function normalizeEnabled(raw: string | undefined): 'true' | 'false' {
  return raw === 'false' ? 'false' : 'true';
}

// The single place that turns in-progress Dashboard form state into the
// exact StoreSetting payload sent on Save. Pure and independently testable —
// every key it writes is fully normalized (never '', undefined or a stray
// type), so a field the admin never touched still saves the value already
// shown on screen instead of an empty placeholder the backend rejects.
export function buildWidgetSavePayload(values: Record<string, string>): Record<string, string> {
  const order = normalizeWidgetOrder(values['widget.order']);
  const payload: Record<string, string> = {
    'widget.popup.title': values['widget.popup.title']?.trim() || DEFAULT_POPUP_TITLE,
    'widget.popup.description': values['widget.popup.description']?.trim() || DEFAULT_POPUP_DESCRIPTION,
    'widget.order': order.join(','),
  };
  for (const id of WIDGET_CHANNEL_IDS) {
    payload[`widget.${id}.name`] = values[`widget.${id}.name`]?.trim() || WIDGET_DEFAULTS[id].name;
    payload[`widget.${id}.description`] = values[`widget.${id}.description`]?.trim() || WIDGET_DEFAULTS[id].description;
    if (id === 'ai') {
      payload['widget.ai.enabled'] = normalizeEnabled(values['widget.ai.enabled']);
    } else {
      payload[`social.${id}.enabled`] = normalizeEnabled(values[`social.${id}.enabled`]);
      payload[`social.${id}.url`] = (values[`social.${id}.url`] ?? '').trim();
    }
  }
  return payload;
}

export function resolveWidgetConfig(settings: Record<string, string>): ResolvedWidgetConfig {
  const order = normalizeWidgetOrder(settings['widget.order']);

  const channels = Object.fromEntries(
    WIDGET_CHANNEL_IDS.map(id => {
      const def = WIDGET_DEFAULTS[id];
      const enabledKey = id === 'ai' ? 'widget.ai.enabled' : `social.${id}.enabled`;
      const logoKey = id === 'ai' ? 'widget.ai.avatarUrl' : `widget.${id}.logoUrl`;
      const channel: ResolvedWidgetChannel = {
        id,
        name: settings[`widget.${id}.name`]?.trim() || def.name,
        description: settings[`widget.${id}.description`]?.trim() || def.description,
        enabled: settings[enabledKey] !== 'false',
        logoUrl: resolveMediaUrl(settings[logoKey]),
        href: id === 'ai' ? undefined : (settings[`social.${id}.url`]?.trim() || undefined),
      };
      return [id, channel];
    }),
  ) as Record<WidgetChannelId, ResolvedWidgetChannel>;

  const toggleAvatarUrl = resolveMediaUrl(settings['widget.ai.toggleAvatarUrl']?.trim() || settings['widget.ai.avatarUrl']);

  return {
    popupTitle: settings['widget.popup.title']?.trim() || DEFAULT_POPUP_TITLE,
    popupDescription: settings['widget.popup.description']?.trim() || DEFAULT_POPUP_DESCRIPTION,
    order,
    channels,
    toggleAvatarUrl,
  };
}
