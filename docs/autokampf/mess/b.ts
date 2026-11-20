import { beginAdventure } from './src/adventure/save'
import { resolveEncounter } from './src/adventure/sim'
// Zugzeiten 1x [ANNAHME]
const W = { intro: +(process.env.WI??300), normal: +(process.env.WN??450), key: +(process.env.WK??900), info: +(process.env.WF??250), result: +(process.env.WR??500) }   // Wegkampf
const F = { intro: 800, normal: 1300, key: 2100, info: 400, result: 0 }    // Fokuskampf (Wächter)
const NONFIGHT = 2800
const sum = (o: any) => Object.values(o ?? {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) as number
type K = { n: number; oldMs: number; newMs: number; gold: number; exp: number; shards: number; mastery: number; chests: number; turns: number[]; dur: number[]; keys: number[] }
const st: Record<string, K> = {}
const RUNS = 6, N = 3000
for (let run = 0; run < RUNS; run++) {
  const save: any = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, ['m01','m02','m03'][run%3], 1)
  let now = Date.UTC(2026, 10, 20, 8) + run * 7_777_777
  for (let i = 0; i < N; i++) {
    now += 2800
    if (save.hold) save.challengeNow = true
    const g0 = save.gold, s0 = sum(save.shards), m0 = sum(save.mastery), c0 = sum(save.chests)
    let o: any
    try { o = resolveEncounter(save, now, { offline: false, trace: true }) } catch { continue }
    const k = o.kind
    const s = st[k] ??= { n: 0, oldMs: 0, newMs: 0, gold: 0, exp: 0, shards: 0, mastery: 0, chests: 0, turns: [], dur: [], keys: [] }
    s.n++; s.oldMs += 2800
    s.gold += save.gold - g0; s.exp += o.exp ?? 0; s.shards += Math.max(0, sum(save.shards) - s0); s.mastery += sum(save.mastery) - m0; s.chests += Math.max(0, sum(save.chests) - c0)
    const T = k === 'guardian' ? F : W
    let d = 0, turns = 0, keys = 0
    if (!o.traces.length) d = NONFIGHT
    else {
      for (const t of o.traces) {
        t.frames.forEach((fr: any, idx: number) => {
          const hits = fr.hits ?? []
          if (idx === 0 && !hits.length) { d += T.intro; return }
          if (!hits.length) { d += T.info; return }
          turns++
          const key = hits.some((h: any) => h.crit || h.ult || h.ko || h.kind === 'status')
          if (key) keys++
          d += key ? T.key : T.normal
          if (hits.length > 1) d += (hits.length - 1) * (k === 'guardian' ? 250 : 200)
        })
      }
      d += T.result
      if (k !== 'guardian' && process.env.FLOOR) d = Math.max(d, 2800)
    }
    if (i === N - 1) console.log('END run', run, 'region', save.region, 'step', save.step, 'chapter', save.chapter, 'lvls', Object.values(save.mons).map((m: any) => m.lvl).sort((a: number, b: number) => b - a).slice(0, 6).join(','), 'badges', save.badges.length)
    s.newMs += d; s.dur.push(d); s.turns.push(turns); s.keys.push(keys)
  }
}
const q = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))] }
let totOld = 0, totNew = 0, tot: any = { gold: 0, exp: 0, shards: 0, mastery: 0, chests: 0 }
for (const [k, s] of Object.entries(st)) {
  totOld += s.oldMs; totNew += s.newMs
  for (const f of ['gold','exp','shards','mastery','chests']) tot[f] += (s as any)[f]
  console.log(k, 'n', s.n, 'turns med/p90', q(s.turns,.5), q(s.turns,.9), 'keys med', q(s.keys,.5), 'newMs med/p90/mean', q(s.dur,.5), q(s.dur,.9), Math.round(s.newMs/s.n), 'gold/enc', (s.gold/s.n).toFixed(1), 'exp/enc', (s.exp/s.n).toFixed(1), 'shards/enc', (s.shards/s.n).toFixed(4), 'mast/enc', (s.mastery/s.n).toFixed(3), 'chests/enc', (s.chests/s.n).toFixed(3))
}
const h = (ms: number) => ms / 3_600_000
const road=['wild','trainer','find','spring'].map(k=>st[k]).filter(Boolean); const ro=road.reduce((a,s)=>a+s.oldMs,0), rn=road.reduce((a,s)=>a+s.newMs,0); console.log('ROAD factor', (rn/ro).toFixed(3), 'wild R', (st.wild.newMs/st.wild.oldMs).toFixed(3), 'trainer R', (st.trainer.newMs/st.trainer.oldMs).toFixed(3), 'wild min', Math.min(...st.wild.dur), 'share<2800', (st.wild.dur.filter(x=>x<2800).length/st.wild.dur.length).toFixed(3))
console.log('TOTAL old h', h(totOld).toFixed(2), 'new h', h(totNew).toFixed(2), 'factor', (totNew/totOld).toFixed(3))
for (const f of ['gold','exp','shards','mastery','chests']) console.log(f, '/h old', (tot[f]/h(totOld)).toFixed(1), 'new', (tot[f]/h(totNew)).toFixed(1))
{
  const R: Record<string, number> = { wild: +(process.env.RW ?? 1.75), trainer: +(process.env.RT ?? 2.0), find: +(process.env.RF ?? 1.65), spring: 1 }
  const ks = ['wild', 'trainer', 'find', 'spring'].filter((k) => st[k])
  const ro = ks.reduce((a, k) => a + st[k].oldMs, 0), rn = ks.reduce((a, k) => a + st[k].newMs, 0)
  for (const f of ['gold', 'exp', 'shards', 'mastery', 'chests']) {
    const old = ks.reduce((a, k) => a + (st[k] as any)[f], 0) / h(ro)
    const raw = ks.reduce((a, k) => a + (st[k] as any)[f], 0) / h(rn)
    const comp = ks.reduce((a, k) => a + (st[k] as any)[f] * R[k], 0) / h(rn)
    console.log('ROAD', f, '/h alt', old.toFixed(1), 'neu ohne Ausgleich', raw.toFixed(1), ((raw / old - 1) * 100).toFixed(1) + '%', 'mit Ausgleich', comp.toFixed(1), ((comp / old - 1) * 100).toFixed(1) + '%')
  }
  console.log('wild/h alt', (st.wild.n / h(st.wild.oldMs)).toFixed(0), 'neu', (st.wild.n / h(st.wild.newMs)).toFixed(0), 'road enc/h alt', (ks.reduce((a,k)=>a+st[k].n,0)/h(ro)).toFixed(0), 'neu', (ks.reduce((a,k)=>a+st[k].n,0)/h(rn)).toFixed(0))
}
