import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCadPurchasePresentation,
  normalizeCadDownloadResponse,
  normalizeCadDownloadsResponse,
  normalizeCadProductAccessResponse
} from '../src/utils/cadDownloads.js'

test('normalizes the standard API response envelope without dropping entitlements', () => {
  const entitlements = [{ id: 'entitlement-1', productId: 'product-1', title: 'Purchased model' }]
  const payload = normalizeCadDownloadsResponse({
    data: {
      success: true,
      data: { entitlements }
    }
  })

  assert.deepEqual(payload.entitlements, entitlements)
})

test('accepts an already-unwrapped CAD downloads payload', () => {
  const entitlements = [{ id: 'entitlement-1' }]
  assert.deepEqual(normalizeCadDownloadsResponse({ entitlements }), { entitlements })
})

test('rejects malformed successful responses rather than presenting them as an empty list', () => {
  assert.throws(
    () => normalizeCadDownloadsResponse({ data: { success: true, data: {} } }),
    /unexpected response while loading CAD downloads/
  )
})

test('normalizes the standard API envelope for an authorized download link', () => {
  const result = { downloadUrl: 'signed-test-url', fileName: 'part.step' }
  assert.deepEqual(
    normalizeCadDownloadResponse({ data: { success: true, data: result } }),
    result
  )
})

test('rejects a response without a secure download link', () => {
  assert.throws(
    () => normalizeCadDownloadResponse({ data: { success: true, data: {} } }),
    /did not return a secure CAD download link/
  )
})

test('normalizes the backend ownership response envelope', () => {
  assert.deepEqual(
    normalizeCadProductAccessResponse({ data: { success: true, data: { hasAccess: true } } }),
    { hasAccess: true }
  )
})

test('shows Purchased for an authenticated owner and My Downloads is linked by the detail page', () => {
  assert.equal(getCadPurchasePresentation({
    isAuthLoading: false,
    isAuthenticated: true,
    role: 'student',
    ownershipStatus: 'owned',
    purchaseAvailable: true
  }), 'owned')
})

test('shows Buy Model to an authenticated student only after ownership is confirmed false', () => {
  assert.equal(getCadPurchasePresentation({
    isAuthLoading: false,
    isAuthenticated: true,
    role: 'student',
    ownershipStatus: 'not-owned',
    purchaseAvailable: true
  }), 'purchase')
})

test('does not present an unpurchased state while authentication or ownership is loading or failed', () => {
  const common = { isAuthenticated: true, role: 'student', purchaseAvailable: true }
  assert.equal(getCadPurchasePresentation({ ...common, isAuthLoading: true, ownershipStatus: 'not-owned' }), 'checking')
  assert.equal(getCadPurchasePresentation({ ...common, isAuthLoading: false, ownershipStatus: 'checking' }), 'checking')
  assert.equal(getCadPurchasePresentation({ ...common, isAuthLoading: false, ownershipStatus: 'error' }), 'error')
})

test('keeps the purchase flow for a confirmed non-owner and requires a student role', () => {
  assert.equal(getCadPurchasePresentation({
    isAuthLoading: false,
    isAuthenticated: true,
    role: 'student',
    ownershipStatus: 'not-owned',
    purchaseAvailable: true
  }), 'purchase')
  assert.equal(getCadPurchasePresentation({
    isAuthLoading: false,
    isAuthenticated: true,
    role: 'admin',
    ownershipStatus: 'idle',
    purchaseAvailable: true
  }), 'student-required')
})
