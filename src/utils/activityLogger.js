const ActivityLog = require('../models/ActivityLog');

/**
 * Log a system activity
 * @param {string} userId - User ID who performed the action
 * @param {string} action - Action identifier (from enum)
 * @param {object} details - Any extra JSON details
 */
const logActivity = async (userId, action, details = {}) => {
    try {
        await ActivityLog.create({
            userId,
            action,
            details
        });

        // Also emit global socket update for the admin dashboard log viewer
        if (global.io) {
            global.io.emit('activityLogged', { userId, action, details, createdAt: new Date() });
            global.io.emit('globalUpdate', { type: 'newActivity', action });
        }
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
};

module.exports = { logActivity };
