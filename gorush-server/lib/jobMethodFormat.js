// Shared naming convention for a job's delivery method: "{Method} {District}"
// (e.g. "Standard Brunei-Muara", "Drop Off Belait") everywhere it's written -
// DB, Detrack job_type, Excel deliveryType column, notifications - except
// "Self Collect", which always stays bare, and MOH's "Standard" charge,
// which is a flat nation-wide rate (same price/duration regardless of
// district) - appending a district to it would misrepresent it as
// district-specific pricing, so it stays bare too. Mirrors
// grfmxstatusupdate's data/jobMethodFormat.js so both apps agree on the
// same output shape.

const DISTRICT_LABELS = { Brunei: 'Brunei-Muara', Tutong: 'Tutong', Belait: 'Belait', Temburong: 'Temburong' };

function getDistrictLabel(district) {
    return DISTRICT_LABELS[district] || district;
}

function extractBaseJobMethod(raw) {
    const method = raw || 'Unknown';
    if (method.startsWith('Standard')) return 'Standard';
    if (method.startsWith('Express')) return 'Express';
    if (method.startsWith('Immediate') || method.startsWith('Immidiate')) return 'Immediate';
    if (method.startsWith('Drop off') || method.startsWith('Drop Off')) return 'Drop Off';
    if (method === 'Pickup') return 'Self Collect';
    return method;
}

function formatJobMethod(rawMethod, district, product) {
    const base = extractBaseJobMethod(rawMethod);
    if (base === 'Self Collect') return base;
    if (base === 'Express') return base; // Express is Brunei-Muara only, so the district is redundant
    if (product === 'pharmacymoh' && base === 'Standard') return base;
    const label = getDistrictLabel(district);
    return label ? `${base} ${label}`.trim() : base;
}

module.exports = { getDistrictLabel, extractBaseJobMethod, formatJobMethod };
