// src/routes/superAdminRoutes.js

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
    loadOverview, 
    getAllUsers, 
    updateUserRole, 
    loadReports, 
    updateReportStatus,
    getNotifications
} from '../controllers/superAdminController.js';

const router = express.Router();

/************************************************************
 * 🔐 Authentication & Role Check (Superadmin only)
 ************************************************************/
router.use(protect);
router.use(authorize('superadmin'));

/************************************************************
 * 📊 Dashboard Overview
 * GET /api/superadmin/overview
 ************************************************************/
router.get('/overview', loadOverview);

/************************************************************
 * 👥 User Management
 * GET /api/superadmin/users
 * PUT /api/superadmin/role/:id
 ************************************************************/
router.get('/users', getAllUsers);
router.put('/role/:id', updateUserRole);

/************************************************************
 * 📨 Report Management
 * GET /api/superadmin/reports
 * PUT /api/superadmin/reports/:reportId
 ************************************************************/
router.get('/reports', loadReports);
router.put('/reports/:reportId', updateReportStatus);

/************************************************************
 * 🔔 Notification Management
 * GET /api/superadmin/notifications
 ************************************************************/
router.get('/notifications', getNotifications);

export default router;
