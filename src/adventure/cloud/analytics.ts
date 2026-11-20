import { FLUSH_MS, QUEUE_MAX } from './config'

/** The eleven events this client sends. No catch, gacha, ad, or payment events. The server still accepts the old name lootbox_open. */
export const EVENT_NAMES = [
  'session_start',
  'tutorial_step',
  'tab_open',
  'stage_clear',
  'stage_fail',
  'guardian_win',
  'guardian_fail',
  'chest_open',
  'shard_drop',
  'star_up',
  'species_unlock'
] as const

export type EventName = (typeof EVENT_NAMES)[number]
export type Consent = 'unset' | 'yes' | 'no'
export type PropValue = string | number | boolean

export interface AnalyticsEvent {
  event: EventName
  props: Record<string, PropValue>
}

const EVENT_SET = new Set<string>(EVENT_NAMES)
const PII_KEY = /^(email|e-mail|mail|name|player_name|user|user_id|player_id|device|device_id|ip|phone|token|password|address)$/i

export function isEventName(name: string): name is EventName {
  return EVENT_SET.has(name)
}

export function anonymousDisabled(message: string, code = ''): boolean {
  const text = `${code} ${message}`.toLowerCase()
  return text.includes('anonymous_provider_disabled') || (text.includes('anonymous') && text.includes('disabled'))
}

/** Drop emails, names, and anything else that is not a short game value. */
export function sanitizeProps(props: Record<string, unknown>): Record<string, PropValue> {
  const out: Record<string, PropValue> = {}
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEY.test(key)) continue
    if (typeof value === 'boolean') {
      out[key] = value
      continue
    }
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = value
      continue
    }
    if (typeof value !== 'string') continue
    const text = value.trim()
    if (!text || text.length > 64 || text.includes('@')) continue
    out[key] = text
  }
  return out
}

/** Nothing is recorded unless consent is an explicit yes. Unknown events are dropped. */
export function acceptEvent(name: string, props: Record<string, unknown>, consent: Consent): AnalyticsEvent | null {
  if (consent !== 'yes') return null
  if (!isEventName(name)) return null
  return { event: name, props: sanitizeProps(props) }
}

export function enqueue(queue: readonly AnalyticsEvent[], event: AnalyticsEvent, max = QUEUE_MAX): AnalyticsEvent[] {
  const room = Math.max(0, max)
  const next = queue.length >= room ? queue.slice(queue.length - room + 1) : queue.slice()
  if (room > 0) next.push(event)
  return next
}

export function capQueue(queue: readonly AnalyticsEvent[], max = QUEUE_MAX): AnalyticsEvent[] {
  if (queue.length <= max) return queue.slice()
  return queue.slice(queue.length - max)
}

/** `force` is pause/close. Otherwise the batch waits for the flush interval. */
export function eventsToSend(queue: readonly AnalyticsEvent[], now: number, lastFlush: number, force: boolean, interval = FLUSH_MS): { send: AnalyticsEvent[]; keep: readonly AnalyticsEvent[] } {
  if (!queue.length) return { send: [], keep: queue }
  if (!force && now - lastFlush < interval) return { send: [], keep: queue }
  return { send: queue.slice(), keep: [] }
}

export function validEmail(value: string): boolean {
  const text = value.trim()
  return text.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
}
