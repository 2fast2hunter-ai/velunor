import { adsCfg, hasUnlock } from './data'
import type { AdPlacement, SaveData } from './types'

export type RewardedResult = 'completed' | 'skipped' | 'unavailable'

export interface AdService {
  init(): Promise<void>
  isRewardedAvailable(): boolean
  showRewarded(placement: string): Promise<RewardedResult>
  showInterstitial(trigger: string): Promise<void>
  showBanner(scene: string): void
  hideBanner(): void
  gameplayStart(): void
  gameplayStop(): void
}

/** GitHub Pages, itch.io and local dev: no fill, no punishment. */
export class NoAdsAdapter implements AdService {
  async init(): Promise<void> {}
  isRewardedAvailable(): boolean {
    return false
  }
  async showRewarded(): Promise<RewardedResult> {
    return 'unavailable'
  }
  async showInterstitial(): Promise<void> {}
  showBanner(): void {}
  hideBanner(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
}

export const ads: AdService = new NoAdsAdapter()

export function bannerEnabled(): boolean {
  return false
}

export const adSession = { playtimeSec: 0, hiddenSince: 0, adPlaying: false }

export function currentPlatform(): string {
  const fromEnv = import.meta.env.VITE_PLATFORM
  return (typeof fromEnv === 'string' && fromEnv) || adsCfg.platform || 'none'
}

export function onAdVisibility(now: number): void {
  if (typeof document !== 'undefined' && document.hidden) {
    adSession.hiddenSince = now
    return
  }
  if (adSession.hiddenSince && now - adSession.hiddenSince >= adsCfg.interstitial.sessionIdleResetSec * 1000) {
    adSession.playtimeSec = 0
  }
  adSession.hiddenSince = 0
}

export function tickAdSession(): void {
  if (typeof document !== 'undefined' && document.hidden) return
  if (adSession.adPlaying) return
  adSession.playtimeSec += 1
}

export function setSessionPlaytimeForTests(seconds: number): void {
  adSession.playtimeSec = seconds
}

export function canShowInterstitial(save: SaveData, trigger: 'battle_end' | 'chapter_change', now: number, platform = currentPlatform()): boolean {
  const override = adsCfg.interstitial.platformOverrides[platform as 'poki'] 
  const enabled = override?.enabled ?? adsCfg.interstitial.enabled
  if (!enabled || !adsCfg.interstitial.triggers.includes(trigger)) return false
  if (!save.tutorialDone && !save.campaign.cleared['1-5']) return false
  if (adSession.playtimeSec < adsCfg.interstitial.minSessionPlaytimeSec) return false
  if (save.ads.lastInterstitialAt > 0 && now - save.ads.lastInterstitialAt < adsCfg.interstitial.minIntervalSec * 1000) return false
  if (save.ads.lastRewardedAt && now - save.ads.lastRewardedAt < adsCfg.interstitial.afterRewardedGraceSec * 1000) return false
  if (save.ads.interstitialToday >= adsCfg.interstitial.maxPerDay) return false
  if (trigger === 'battle_end' && save.lastBattleResult !== 'win') return false
  return true
}

export interface AdButtonState {
  visible: boolean
  enabled: boolean
  label: string
  reason: string
}

export function rewardedButton(save: SaveData, placement: AdPlacement, now: number): AdButtonState {
  const def = adsCfg.rewarded.placements[placement]
  const used = save.ads.counts[placement] ?? 0
  const remain = Math.max(0, def.dailyCap - used)
  if (remain <= 0 || save.ads.rewardedToday >= adsCfg.rewarded.globalDailyCap) {
    return { visible: false, enabled: false, label: '', reason: '' }
  }
  const label = adLabel(placement, remain, def.dailyCap)
  if (!ads.isRewardedAvailable()) {
    return { visible: true, enabled: false, label, reason: 'Gerade keine Werbung verfügbar' }
  }
  if (def.cooldownSec > 0 && save.ads.lastRewardedAt > 0) {
    const readyAt = save.ads.lastRewardedAt + def.cooldownSec * 1000
    if (now < readyAt) {
      const sec = Math.ceil((readyAt - now) / 1000)
      return { visible: true, enabled: false, label, reason: `Bereit in ${sec}s` }
    }
  }
  return { visible: true, enabled: true, label, reason: '' }
}

function adLabel(placement: AdPlacement, remain: number, cap: number): string {
  const names: Record<AdPlacement, string> = {
    double_reward: 'Belohnung ×2',
    gem_bonus: '+20 Juwelen',
    free_pull: 'Gratis-Ziehung',
    mine_boost: 'Turbo +2 Std.',
    build_speed: 'Bau −30 Min.',
    training_speed: 'Training −50 %',
    breeding_speed: 'Zucht −50 %'
  }
  return `${names[placement]} (${remain}/${cap})`
}

export function canOfferFreePull(save: SaveData): boolean {
  return Boolean(save.campaign.cleared['1-3'])
}

export function canOfferGemBonus(save: SaveData): boolean {
  return Boolean(save.campaign.cleared['1-3'])
}

export async function tryRewarded(save: SaveData, placement: AdPlacement, now: number): Promise<RewardedResult> {
  const button = rewardedButton(save, placement, now)
  if (!button.visible || !button.enabled) return 'unavailable'
  const result = await ads.showRewarded(placement)
  if (result !== 'completed') return result
  save.ads.counts[placement] = (save.ads.counts[placement] ?? 0) + 1
  save.ads.rewardedToday += 1
  save.ads.lastRewardedAt = now
  return 'completed'
}

export async function maybeInterstitial(save: SaveData, trigger: 'battle_end' | 'chapter_change', now: number): Promise<void> {
  if (!canShowInterstitial(save, trigger, now)) return
  adSession.adPlaying = true
  try {
    await ads.showInterstitial(trigger)
  } finally {
    adSession.adPlaying = false
  }
  save.ads.lastInterstitialAt = now
  save.ads.interstitialToday += 1
}

export function placementUnlocked(save: SaveData, placement: AdPlacement): boolean {
  if (placement === 'gem_bonus' || placement === 'free_pull') return canOfferGemBonus(save)
  if (placement === 'double_reward') return true
  if (placement === 'build_speed') return true
  if (placement === 'training_speed') return hasUnlock(save.buildings.townhall.level, 'campaign_ch1')
  return true
}
