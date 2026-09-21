'use client'

// ─────────────────────────────────────────────────────────────
// CLIENT STORAGE ENGINE
// Provides persistent localStorage-backed state across all pages
// (Calculator, Inventory, Admin) with instant cross-tab custom events
// ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  UNITS: 'sun_urban_units_v6',
  FOLDERS: 'sun_urban_folders_v6',
  POLICIES: 'sun_urban_policies_v6',
  PAYMENT_PLANS: 'sun_urban_plans_v6',
  LOAN_PROGRAMS: 'sun_urban_loans_v6',
  IS_INITIALIZED: 'sun_urban_initialized_v6',
  CLEARED_SAMPLES: 'sun_urban_cleared_samples_v6',
}

// ─── UNITS STORE ──────────────────────────────────────────────

export function getStoredUnits(fallbackUnits: any[]): any[] {
  if (typeof window === 'undefined') return fallbackUnits
  try {
    const isCleared = localStorage.getItem(STORAGE_KEYS.CLEARED_SAMPLES) === 'true'
    const raw = localStorage.getItem(STORAGE_KEYS.UNITS)

    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // If user explicitly cleared samples and array is empty, keep it empty!
        if (parsed.length === 0 && isCleared) return []
        // If has items, return them
        if (parsed.length > 0) return parsed
      }
    }

    if (isCleared) return []

    // First time: initialize with fallback units if not yet set
    if (!localStorage.getItem(STORAGE_KEYS.IS_INITIALIZED) && fallbackUnits.length > 0) {
      localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(fallbackUnits))
      localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true')
    }
    return fallbackUnits
  } catch {
    return fallbackUnits
  }
}

export function saveStoredUnits(units: any[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units))
    localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true')
    window.dispatchEvent(new CustomEvent('sun_units_updated', { detail: units }))
  } catch (err) {
    console.warn('[clientStore] Failed to save units to localStorage:', err)
  }
}

export function addOrUpdateStoredUnit(unit: any, currentUnits: any[]): any[] {
  const index = currentUnits.findIndex(
    (u) => u.id === unit.id || (unit.unitCode && u.unitCode === unit.unitCode)
  )
  let updated: any[]
  if (index >= 0) {
    updated = currentUnits.map((u, i) => (i === index ? { ...u, ...unit } : u))
  } else {
    updated = [unit, ...currentUnits]
  }
  saveStoredUnits(updated)
  return updated
}

export function deleteStoredUnit(id: string, currentUnits: any[]): any[] {
  const updated = currentUnits.filter((u) => u.id !== id && u.unitCode !== id)
  saveStoredUnits(updated)
  return updated
}

export function clearAllStoredUnits(): any[] {
  if (typeof window === 'undefined') return []
  try {
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.CLEARED_SAMPLES, 'true')
    localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true')
    window.dispatchEvent(new CustomEvent('sun_units_updated', { detail: [] }))
    return []
  } catch {
    return []
  }
}

export function resetStoredUnitsToDefault(fallbackUnits: any[]): any[] {
  if (typeof window === 'undefined') return fallbackUnits
  try {
    localStorage.removeItem(STORAGE_KEYS.CLEARED_SAMPLES)
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(fallbackUnits))
    localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true')
    window.dispatchEvent(new CustomEvent('sun_units_updated', { detail: fallbackUnits }))
    return fallbackUnits
  } catch {
    return fallbackUnits
  }
}

// ─── POLICY FOLDERS STORE ─────────────────────────────────────

export function getStoredFolders(fallbackFolders: any[]): any[] {
  if (typeof window === 'undefined') return fallbackFolders
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    if (fallbackFolders && fallbackFolders.length > 0) {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(fallbackFolders))
    }
    return fallbackFolders
  } catch {
    return fallbackFolders
  }
}

export function saveStoredFolders(folders: any[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders))
    window.dispatchEvent(new CustomEvent('sun_folders_updated', { detail: folders }))
  } catch (err) {
    console.warn('[clientStore] Failed to save folders:', err)
  }
}

export function addOrUpdateStoredFolder(folder: any, currentFolders: any[]): any[] {
  const index = currentFolders.findIndex((f) => f.id === folder.id)
  let updated: any[]
  if (index >= 0) {
    updated = currentFolders.map((f, i) => (i === index ? { ...f, ...folder } : f))
  } else {
    updated = [folder, ...currentFolders]
  }
  saveStoredFolders(updated)
  return updated
}

export function deleteStoredFolder(id: string, currentFolders: any[]): any[] {
  const updated = currentFolders.filter((f) => f.id !== id)
  saveStoredFolders(updated)
  return updated
}

// ─── POLICIES STORE ───────────────────────────────────────────

export function getStoredPolicies(fallbackPolicies: any[]): any[] {
  if (typeof window === 'undefined') return fallbackPolicies
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POLICIES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    if (fallbackPolicies && fallbackPolicies.length > 0) {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(fallbackPolicies))
    }
    return fallbackPolicies
  } catch {
    return fallbackPolicies
  }
}

export function saveStoredPolicies(policies: any[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies))
    window.dispatchEvent(new CustomEvent('sun_policies_updated', { detail: policies }))
  } catch (err) {
    console.warn('[clientStore] Failed to save policies:', err)
  }
}

// ─── PAYMENT PLANS STORE ──────────────────────────────────────

export function getStoredPaymentPlans(fallbackPlans: any[]): any[] {
  if (typeof window === 'undefined') return fallbackPlans
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENT_PLANS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    if (fallbackPlans && fallbackPlans.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_PLANS, JSON.stringify(fallbackPlans))
    }
    return fallbackPlans
  } catch {
    return fallbackPlans
  }
}

export function saveStoredPaymentPlans(plans: any[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_PLANS, JSON.stringify(plans))
    window.dispatchEvent(new CustomEvent('sun_plans_updated', { detail: plans }))
  } catch (err) {
    console.warn('[clientStore] Failed to save payment plans:', err)
  }
}

// ─── LOAN PROGRAMS STORE ──────────────────────────────────────

export function getStoredLoanPrograms(fallbackPrograms: any[]): any[] {
  if (typeof window === 'undefined') return fallbackPrograms
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOAN_PROGRAMS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    if (fallbackPrograms && fallbackPrograms.length > 0) {
      localStorage.setItem(STORAGE_KEYS.LOAN_PROGRAMS, JSON.stringify(fallbackPrograms))
    }
    return fallbackPrograms
  } catch {
    return fallbackPrograms
  }
}

export function saveStoredLoanPrograms(programs: any[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.LOAN_PROGRAMS, JSON.stringify(programs))
    window.dispatchEvent(new CustomEvent('sun_loans_updated', { detail: programs }))
  } catch (err) {
    console.warn('[clientStore] Failed to save loan programs:', err)
  }
}
