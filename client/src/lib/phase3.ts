/** Maps procedure catalogue codes to GET /integrations/:code/status keys (backend NormalizeCode). */
export function integrationCodeForProcedure(code: string): string | null {
  const n = code.trim().toLowerCase().replace(/-/g, '_')
  const map: Record<string, string> = {
    visa: 'visa',
    asan_viza: 'visa',
    customs_incentive: 'customs',
    electricity_connection: 'electricity',
    gas_connection: 'gas',
    water_connection: 'water',
    work_permit: 'migration',
    temporary_residence: 'migration',
    e_notary: 'notary',
    construction_permit: 'planning',
    zoning_prequery: 'planning',
    emdx: 'cadastre',
    property_register: 'cadastre',
    bank_account: 'remote_bank',
    e_residency: 'e_residency',
  }
  return map[n] ?? null
}

export function applicationTypeForProcedure(code: string): string {
  switch (code) {
    case 'visa':
      return 'visa'
    case 'customs_incentive':
      return 'customs_incentive'
    case 'electricity_connection':
    case 'gas_connection':
    case 'water_connection':
      return 'utility_connection'
    case 'e_residency':
      return 'e_residency'
    case 'bank_account':
      return 'bank_kyc'
    case 'company_registration':
      return 'company_registration'
    default:
      return 'consultation'
  }
}

export function isZoningProcedure(code: string) {
  return code === 'zoning_prequery' || code === 'construction_permit'
}

export function isBankProcedure(code: string) {
  return code === 'bank_account'
}
