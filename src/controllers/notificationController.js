const NotificationService = require('../services/notificationService');

exports.getUserNotifications = async (req, res) => {
    try {
        const notifications = await NotificationService.getUserNotifications(req.user._id);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await NotificationService.markAllAsRead(req.user._id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
