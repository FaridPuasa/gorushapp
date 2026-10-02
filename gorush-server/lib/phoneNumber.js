// Server-side phone normalization for order intake - kept in lockstep with
// grfmxstatusupdate's own processPhoneNumber() (index.js), since both apps
// write into the same orders table and need the same "+673XXXXXXX" shape.
//
// Added 2026-10-02: the order/warga-emas/sign-up/careers forms all rely on
// the client (gorush-client/lib/validators.js) to prepend "+673" via its
// country-code picker, with no server-side check beyond non-empty. Two gaps
// were found in real data: (1) a pre-filled phone field that already lacked
// a "+" (e.g. sourced from a malformed saved profile number) gets resent and
// stored as-is; (2) a user typing "+673XXXXXXX" into a field whose picker
// already prepends "673" produces a double-prefixed value like
// "673+6738667445". The client no longer allows (2) to happen as easily
// (lib/validators.js's sanitizePhoneDigits), but this is a second,
// independent backstop - any other caller of these routes (a future API
// client, a replay, or a form the client-side fix missed) would otherwise
// still store the number exactly as sent.
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return phoneNumber;

    const phoneStr = phoneNumber.toString().trim();
    const cleanNumber = phoneStr.replace(/\D/g, '');

    // Double country-code prefix - "673" followed by an already-complete
    // "673XXXXXXX" (with or without a "+" in between, both collapse to the
    // same 13 digits once non-digits are stripped). Checked before the
    // "already starts with +" shortcut below, since the double-prefix raw
    // shape can itself start with "+" too (e.g. "+673673XXXXXXX").
    if (cleanNumber.length === 13 && /^673673\d{7}$/.test(cleanNumber)) {
        return "+" + cleanNumber.substring(3);
    }

    if (phoneStr.startsWith('+')) return phoneStr;

    if (cleanNumber.length === 7) return "+673" + cleanNumber;
    if (cleanNumber.length === 10 && cleanNumber.startsWith('673')) return "+" + cleanNumber;
    if (cleanNumber.length === 11 && cleanNumber.startsWith('673')) return "+" + cleanNumber;
    if (cleanNumber.length === 8 && cleanNumber.startsWith('0')) return "+673" + cleanNumber.substring(1);

    // Anything else (a non-Brunei number, or a shape we don't recognize) is
    // stored unchanged rather than guessed at.
    return phoneStr;
}

module.exports = { normalizePhoneNumber };
