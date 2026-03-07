const ContactMessage = require('../models/ContactMessage');

const submitContactForm = async (req, res, next) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const newMessage = await ContactMessage.create({ name, email, message });
        res.status(201).json({
            success: true,
            message: 'We usually respond within 24 hours. Please check your Spam folder if you do not see our response.',
            data: newMessage
        });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

module.exports = { submitContactForm };
