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

export function interstitialConfigEnabled(): boolean {
  if (typeof location !== 'undefined') {
    const host = location.hostname
    if (host.endsWith('github.io') || host.endsWith('itch.io') || host === 'localhost' || host === '127.0.0.1' || host === '') {
      return adsCfg.pages.interstitialEnabled
    }
  }
  return adsCfg.interstitial.enabled
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
    training_speed: 'Training −50 %'
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

export async function maybeInterstitial(save: SaveData, trigger: 'result_to_city' | 'portal_result_close', now: number, victory: boolean): Promise<void> {
  if (!interstitialConfigEnabled()) return
  if (!adsCfg.interstitial.triggers.includes(trigger)) return
  if (!victory && trigger === 'result_to_city') return
  if (!save.campaign.cleared[adsCfg.interstitial.unlockAfterStage]) return
  if (now - save.sessionStartedAt < adsCfg.interstitial.sessionStartGraceSec * 1000) return
  if (now - save.createdAt < adsCfg.interstitial.firstSessionGraceSec * 1000) return
  if (save.ads.lastInterstitialAt && now - save.ads.lastInterstitialAt < adsCfg.interstitial.minIntervalSec * 1000) return
  if (save.ads.lastRewardedAt && now - save.ads.lastRewardedAt < adsCfg.interstitial.afterRewardedGraceSec * 1000) return
  if (save.ads.interstitialToday >= adsCfg.interstitial.maxPerDay) return
  const hourKey = String(Math.floor(now / 3600000))
  const hourCount = save.ads.interstitialHourKey === hourKey ? save.ads.interstitialHourCount : 0
  if (hourCount >= adsCfg.interstitial.maxPerHour) return
  await ads.showInterstitial(trigger)
  save.ads.lastInterstitialAt = now
  save.ads.interstitialToday += 1
  save.ads.interstitialHourKey = hourKey
  save.ads.interstitialHourCount = hourCount + 1
}

export function placementUnlocked(save: SaveData, placement: AdPlacement): boolean {
  if (placement === 'gem_bonus' || placement === 'free_pull') return canOfferGemBonus(save)
  if (placement === 'double_reward') return true
  if (placement === 'build_speed') return true
  if (placement === 'training_speed') return hasUnlock(save.buildings.townhall.level, 'campaign_ch1')
  return true
}
