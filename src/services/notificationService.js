const Notification = require('../models/Notification');

class NotificationService {
    async createNotification(userId, title, message, type = 'system', role = 'user', link = '') {
        try {
            const notification = new Notification({
                userId,
                title,
                message,
                type,
                role,
                link
            });
            await notification.save();

            if (global.io) {
                global.io.emit('globalUpdate', {
                    type: 'notification',
                    userId,
                    role
                });
            }
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    async getUserNotifications(userId) {
        return await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
    }

    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { read: true },
            { new: true }
        );
    }

    async markAllAsRead(userId) {
        return await Notification.updateMany(
            { userId, read: false },
            { read: true }
        );
    }
}

module.exports = new NotificationService();
