const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');
const ActivityLog = require('../models/ActivityLog');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.get('/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        res.status(200).json({
            status: 'healthy',
            database: dbStatus,
            uptime: process.uptime(),
            serverTime: new Date().toISOString(),
            memoryUsage: process.memoryUsage(),
            platform: os.platform(),
            cpuCount: os.cpus().length
        });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

router.get('/logs', protect, restrictTo('admin'), async (req, res, next) => {
    try {
        const logs = await ActivityLog.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
