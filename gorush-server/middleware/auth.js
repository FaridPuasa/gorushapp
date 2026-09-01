const jwt = require('jsonwebtoken');

function getTokenFromHeader(req) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        return header.slice(7);
    }
    return null;
}

function requireAuth(req, res, next) {
    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ error: "Authentication required." });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
    }
}

function requireAdmin(req, res, next) {
    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ error: "Authentication required." });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required." });
        }
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
    }
}

function requireRole(...roles) {
    return function (req, res, next) {
        const token = getTokenFromHeader(req);
        if (!token) {
            return res.status(401).json({ error: "Authentication required." });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ error: "You don't have access to this." });
            }
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
            req.userRole = decoded.role;
            next();
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
        }
    };
}

function optionalAuth(req, res, next) {
    const token = getTokenFromHeader(req);
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.userId;
        } catch (err) {
            // Invalid or expired token: proceed as guest rather than rejecting the request.
        }
    }
    next();
}

module.exports = { requireAuth, requireAdmin, requireRole, optionalAuth };
