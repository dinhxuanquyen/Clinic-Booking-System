export function buildInsuranceSnapshot(user) {
  if (!user?.insuranceEnabled) return null;

  return {
    enabled: true,
    insuranceNumber: user.insuranceNumber || '',
    insuranceExpiryDate: user.insuranceExpiryDate || null,
    insuranceRegisteredHospital: user.insuranceRegisteredHospital || ''
  };
}

export function insuranceProfileResponse(user) {
  return {
    insuranceEnabled: Boolean(user?.insuranceEnabled),
    insuranceNumber: user?.insuranceNumber || '',
    insuranceExpiryDate: user?.insuranceExpiryDate || null,
    insuranceRegisteredHospital: user?.insuranceRegisteredHospital || '',
    insuranceNote: user?.insuranceNote || ''
  };
}

export function hasInsuranceSnapshot(snapshot) {
  return Boolean(snapshot?.enabled && snapshot?.insuranceNumber);
}
