const JPMC_APPOINTMENT_PLACES = ['JPMC', 'PJSC', 'GJPMC'];

// JPMC/PJSC Patient No. is exactly 8 digits; GJPMC is always "G-" followed by
// exactly 6 digits. Only checked when both a location and a number are
// present - an appointment location left unset (allowed on register/edit
// profile) means the format is unknown, so nothing to validate yet.
function validateJpmcPatientNumber(appointmentPlace, patientNumber) {
    if (!appointmentPlace || !patientNumber) return null;
    if (appointmentPlace === 'GJPMC') {
        if (!/^G-\d{6}$/.test(patientNumber)) {
            return 'GJPMC Patient No. must be "G-" followed by exactly 6 digits.';
        }
    } else if (appointmentPlace === 'JPMC' || appointmentPlace === 'PJSC') {
        if (!/^\d{8}$/.test(patientNumber)) {
            return 'JPMC/PJSC Patient No. must be exactly 8 digits.';
        }
    }
    return null;
}

module.exports = { validateJpmcPatientNumber, JPMC_APPOINTMENT_PLACES };
