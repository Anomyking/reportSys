// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

/************************************************************
 * 🛡️ PROTECT — Auth Middleware
 * Verifies JWT and attaches the decoded user to req.user
 ************************************************************/
export const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check for token: must start with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied: No token provided"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, ... }
        next();
    } catch (err) {
        console.error("JWT Error:", err.message);
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};


/************************************************************
 * 🔐 AUTHORIZE — Role Based Access Control (RBAC)
 * Allows route only if user role is permitted
 ************************************************************/
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user?.role) {
            return res.status(403).json({
                message: "Forbidden: No role attached to user"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied: ${req.user.role} is not allowed`
            });
        }

        next();
    };
};
