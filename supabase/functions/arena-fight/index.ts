import { admin, caller, cors, json } from '../_shared/admin.ts'
import {
  arenaMatch,
  defenseApply,
  eloDelta,
  practiceTeam,
  readFightIndex,
  spendAttack,
  leagueOf,
  PRACTICE_LABEL,
  type ArenaTeam,
  type OpponentCard
} from '../../../src/adventure/arena.ts'

function teamOf(value: unknown): ArenaTeam | null {
  if (!value || typeof value !== 'object') return null
  const team = value as ArenaTeam
  if (!Array.isArray(team.fighters) || team.fighters.length !== 6) return null
  return team
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  let body: unknown = null
  try { body = await req.json() } catch { body = null }
  const index = readFightIndex(body)
  if (index == null) return json({ error: 'index' }, 400)
  const db = admin()
  const closed = await db.rpc('close_arena_season')
  if (closed.error) return json({ error: 'season' }, 500)
  const flag = await db.from('profiles').select('flag_level').eq('user_id', user.id).maybeSingle()
  if (flag.data?.flag_level === 2) return json({ error: 'flag' }, 403)
  const row = await db.from('arena_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (row.error || !row.data) return json({ error: 'team' }, 400)
  const attack = teamOf(row.data.defense)
  if (!attack) return json({ error: 'team' }, 400)
  const suggestions = Array.isArray(row.data.suggestions) ? row.data.suggestions as OpponentCard[] : []
  const card = suggestions[index]
  if (!card) return json({ error: 'index' }, 400)
  let defense: ArenaTeam | null = null
  let practice = Boolean(card.practice)
  let defenderId = ''
  let defenderRating = Number(card.rating) || 1000
  if (!practice) {
    const other = await db.from('arena_profiles').select('rating, defense').eq('user_id', card.id).maybeSingle()
    const otherFlag = await db.from('profiles').select('flag_level').eq('user_id', card.id).maybeSingle()
    defense = teamOf(other.data?.defense)
    if (!defense || otherFlag.data?.flag_level === 2) return json({ error: 'opponent' }, 409)
    defenderId = card.id
    defenderRating = Number(other.data?.rating) || defenderRating
  } else defense = practiceTeam(card.seed || 1)
  const now = Date.now()
  const spent = spendAttack({
    attacks: Number(row.data.attacks) || 0,
    attacksAt: Date.parse(String(row.data.attacks_at)),
    dayKey: String(row.data.day_key ?? '')
  }, now)
  if (!spent) return json({ error: 'limit' }, 429)
  const held = await db.from('arena_profiles').update({
    attacks: spent.attacks,
    attacks_at: new Date(spent.attacksAt).toISOString(),
    day_key: spent.dayKey,
    updated_at: new Date(now).toISOString()
  }).eq('user_id', user.id).eq('updated_at', row.data.updated_at).select('attacks')
  if (held.error || !held.data?.length) return json({ error: 'limit' }, 429)
  const started = Date.now()
  const replay = arenaMatch(attack, defense, card.seed || 1)
  const elapsed = Date.now() - started
  const attackerRating = Number(row.data.rating) || 1000
  let nextRating = attackerRating
  let defenseDelta = 0
  if (!practice) {
    nextRating = Math.max(0, attackerRating + eloDelta(attackerRating, defenderRating, replay.win))
    const defenderRow = await db.from('arena_profiles').select('rating, defense_delta, defense_day').eq('user_id', defenderId).maybeSingle()
    const sameDay = String(defenderRow.data?.defense_day ?? '') === spent.dayKey
    const today = sameDay ? Number(defenderRow.data?.defense_delta) || 0 : 0
    const applied = defenseApply(today, !replay.win)
    defenseDelta = applied.applied
    const defenderNext = Math.max(0, (Number(defenderRow.data?.rating) || defenderRating) + defenseDelta)
    await db.from('arena_profiles').update({
      rating: defenderNext,
      defense_delta: applied.today,
      defense_day: spent.dayKey
    }).eq('user_id', defenderId)
    const name = await db.from('player_names').select('hidden, display, name, tag').eq('user_id', user.id).maybeSingle()
    const label = name.data?.hidden ? `Spieler#${name.data.tag}` : (name.data?.display || 'Spieler')
    await db.from('arena_logs').insert({
      defender: defenderId,
      attacker: user.id,
      attacker_label: label,
      attacker_win: replay.win,
      practice: false,
      win: !replay.win,
      delta: defenseDelta,
      seed: replay.seed
    })
  }
  await db.from('arena_profiles').update({
    rating: nextRating,
    suggestions: []
  }).eq('user_id', user.id)
  return json({
    replay,
    practice,
    label: practice ? PRACTICE_LABEL : card.label,
    rating: nextRating,
    league: leagueOf(nextRating).name,
    attacks: spent.attacks,
    elapsed
  })
})
