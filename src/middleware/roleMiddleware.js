// backend/middleware/roleMiddleware.js
export const superAdminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "superadmin")
    return res.status(403).json({ message: "Access denied: Super Admins only." });
  next();
};

export const adminOrSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!["admin", "superadmin"].includes(req.user.role))
    return res.status(403).json({ message: "Access denied: Admins only." });
  next();
};
