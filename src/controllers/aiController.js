const aiService = require('../services/aiService');

const handleChat = async (req, res, next) => {
    try {
        const { message } = req.body;
        const responseData = await aiService.getResponse(req.user._id, message);

        if (responseData.type === 'handoff') {
            await aiService.createHandoffTicket(req.user._id, message);
        }

        res.json(responseData);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    handleChat
};
