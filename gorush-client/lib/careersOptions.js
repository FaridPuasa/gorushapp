export const HIGHEST_ACHIEVEMENT_OPTIONS = [
  'None', 'O Level', 'A Level', 'Diploma', 'SC2 (Skill Certificate 2)', 'SC3 (Skill Certificate 3)',
  'NTec (National Technical Education Certificate)', 'HNTec (Higher National Technical Education Certificate)',
  'Higher National Diploma (HND)', 'Degree', 'Master', 'Doctor',
];

export const DURATION_OPTIONS = ['Less than 1 month', '1-3 months', '4-6 months', '7-12 months', 'More than 1 year'];

export const PARCEL_NUM_OPTIONS = ['Less than 10', '10-20', '21-30', '31-50', 'More than 50'];

export const CAR_OWN_OPTIONS = ['Car', 'Motorcycle', 'Van', 'None'];

// Which extra application questions and uploads a vacancy's applicationType requires —
// mirrors APPLICATION_TYPE_RULES in the server's routes/careers.js.
const APPLICATION_TYPE_CONFIG = {
  Freelancer: { needsPartTime: true, needsCarOwn: true, needsDeliverBefore: true, needsDriveManual: false, needsLicense: true },
  Dispatcher: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: true, needsDriveManual: true, needsLicense: true },
  Helper: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: false, needsDriveManual: true, needsLicense: true },
  OperationSupport: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: false, needsDriveManual: true, needsLicense: true },
  General: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: false, needsDriveManual: false, needsLicense: false },
};

export function getApplicationTypeConfig(applicationType) {
  return APPLICATION_TYPE_CONFIG[applicationType] || APPLICATION_TYPE_CONFIG.General;
}
