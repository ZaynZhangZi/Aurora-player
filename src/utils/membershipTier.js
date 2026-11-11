function activeMembership(benefit, now) {
  if (!benefit || (benefit.rights !== undefined && benefit.rights !== true)) return false
  if (benefit.expireTime == null) return benefit.rights === true
  const expiresAt = Number(benefit.expireTime)
  return Number.isFinite(expiresAt) && expiresAt > now
}

export function resolveMembershipTier(response, userId, now = Date.now()) {
  if (Number(response?.code) !== 200 || !response.data) return null
  const {data} = response
  if (data.userId != null && String(data.userId) !== String(userId)) return null
  if (activeMembership(data.redplus, now)) return 'svip'
  if (activeMembership(data.associator, now)) return 'vip'
  return null
}
