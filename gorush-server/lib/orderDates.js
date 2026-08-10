// Parses the date-string formats actually found in the live `orders` collection.
// The external order-watcher enriches every order after insert and does not use
// a consistent date format across fields (or even within the same field family —
// e.g. qbExpiryDate is MM/DD/YYYY while qbCreationDate/qbServiceDate are DD/MM/YYYY).
// This must never throw: it reads uncontrolled external data, so unparseable input
// degrades to null rather than breaking a request.
function parseFlexibleDate(value) {
    if (!value || typeof value !== 'string' || value.toUpperCase() === 'N/A') return null;

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
    if (isoMatch) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const plainDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plainDateMatch) {
        const [, y, m, d] = plainDateMatch;
        return new Date(Number(y), Number(m) - 1, Number(d));
    }

    const dmyTimeMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(am|pm))?$/i);
    if (dmyTimeMatch) {
        const [, d, m, y, h, min, ampm] = dmyTimeMatch;
        let hour = h ? Number(h) : 0;
        if (ampm) {
            if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
            if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
        }
        return new Date(Number(y), Number(m) - 1, Number(d), hour, min ? Number(min) : 0);
    }

    const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
        const [, a, b, y] = slashMatch;
        const first = Number(a);
        const second = Number(b);
        // Ambiguous DD/MM/YYYY vs MM/DD/YYYY across fields (qbExpiryDate uses
        // MM/DD/YYYY while qbCreationDate/qbServiceDate use DD/MM/YYYY) — when the
        // second segment can't be a valid month (>12), it must be the day, so read
        // the pair as MM/DD/YYYY; both parts <=12 can't disambiguate, so default DD/MM.
        const [day, month] = second > 12 ? [second, first] : [first, second];
        return new Date(Number(y), month - 1, day);
    }

    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function getOrderCreatedAt(doc) {
    return (
        parseFlexibleDate(doc.creationDate) ||
        parseFlexibleDate(doc.dateTimeSubmission) ||
        doc.createdAt ||
        null
    );
}

function getOrderUpdatedAt(doc) {
    return parseFlexibleDate(doc.lastUpdateDateTime) || doc.updatedAt || null;
}

// There's no dedicated "delivery date" field anywhere in the schema or the external
// system's own data — the closest real signal is the history entry marking the order
// "Completed". Picks the latest such entry (parsed the same flexible way as every other
// order date) in case of a duplicate/re-synced completion entry; returns null while the
// order hasn't been completed yet.
function getOrderDeliveryDate(doc) {
    const history = Array.isArray(doc.history) ? doc.history : [];
    const completedDates = history
        .filter((h) => (h.statusHistory || '').toLowerCase() === 'completed')
        .map((h) => parseFlexibleDate(h.dateUpdated))
        .filter(Boolean)
        .sort((a, b) => b - a);
    return completedDates[0] || null;
}

module.exports = { parseFlexibleDate, getOrderCreatedAt, getOrderUpdatedAt, getOrderDeliveryDate };
