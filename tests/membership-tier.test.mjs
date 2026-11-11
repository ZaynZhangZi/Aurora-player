import assert from 'node:assert/strict'
import test from 'node:test'
import {resolveMembershipTier} from '../src/utils/membershipTier.js'

const now = 1760000000000
const active = {expireTime: now + 60000}
const response = (benefits, userId = 42) => ({code: 200, data: {userId, ...benefits}})

test('membership badges distinguish active black vinyl VIP and SVIP', () => {
  assert.equal(resolveMembershipTier(response({associator: active}), 42, now), 'vip')
  assert.equal(resolveMembershipTier(response({associator: active, redplus: active}), 42, now), 'svip')
  assert.equal(resolveMembershipTier(response({redplus: {rights: true}}), 42, now), 'svip')
})

test('an expired or disabled SVIP benefit falls back only to an active VIP benefit', () => {
  assert.equal(resolveMembershipTier(response({associator: active, redplus: {expireTime: now}}), 42, now), 'vip')
  assert.equal(resolveMembershipTier(response({redplus: {...active, rights: false}}), 42, now), null)
  assert.equal(resolveMembershipTier(response({associator: {expireTime: now - 1, rights: true}}), 42, now), null)
  assert.equal(resolveMembershipTier(response({redVipLevel: 7, musicPackage: active}), 42, now), null)
})

test('unavailable responses and another account cannot display a membership badge', () => {
  assert.equal(resolveMembershipTier(null, 42, now), null)
  assert.equal(resolveMembershipTier({code: 301, data: {redplus: active}}, 42, now), null)
  assert.equal(resolveMembershipTier(response({redplus: active}, 17), 42, now), null)
  assert.equal(resolveMembershipTier(response({associator: {expireTime: 'invalid'}}), 42, now), null)
})
