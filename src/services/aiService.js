const SupportTicket = require('../models/SupportTicket');
const supportService = require('./supportService');

class AIService {
    constructor() {
        this.faqs = [
            {
                keywords: ['book', 'reservation', 'table', 'slot'],
                answer: "To book a table, go to the 'Restaurants' page, select your favorite restaurant, choose a date, time slot, and number of guests. Remember, you can only have ONE active reservation at a time across the entire platform."
            },
            {
                keywords: ['restrict', 'duplicate', 'multi', 'second booking'],
                answer: "Our platform enforces a 'One Active Reservation' rule. You must complete or cancel your current booking before you can make another one at any restaurant."
            },
            {
                keywords: ['partner', 'become', 'join', 'register restaurant'],
                answer: "We'd love to have you! Click on 'Become a Partner'. We offer a premium SaaS model for only ₹199/week, which includes a professional dashboard, real-time analytics, and priority support."
            },
            {
                keywords: ['saas', 'subscription', 'cost', 'price', 'weekly'],
                answer: "Our Restaurant Partner subscription is priced at just ₹199 per week. It grants access to all premium features including the Owner Dashboard, Inventory management, and Real-time reservation tracking."
            },
            {
                keywords: ['cancel', 'refund', 'money back'],
                answer: "You can cancel your reservation from your User Dashboard under 'My Bookings'. Refunds are processed automatically based on the restaurant's cancellation policy (usually 24 hours before the slot)."
            },
            {
                keywords: ['payment', 'razorpay', 'upi', 'card'],
                answer: "We support all major payment methods including UPI, Credit/Debit cards, and Net Banking through our secure Razorpay integration."
            },
            {
                keywords: ['menu', 'food', 'dishes'],
                answer: "You can view the full digital menu of any restaurant on their details page. Many items are also available for pre-booking during your reservation."
            },
            {
                keywords: ['contact', 'support', 'help', 'human', 'agent', 'talk'],
                answer: "I can connect you to a support agent. Would you like me to raise an official support ticket for you? Just say 'Yes, raise a ticket' or 'Talk to human'."
            }
        ];
    }

    async getResponse(userId, message) {
        const msg = message.toLowerCase();

        // Check for handoff request
        if (msg.includes('yes') && (msg.includes('ticket') || msg.includes('raise') || msg.includes('human'))) {
            return {
                type: 'handoff',
                message: "I'm creating a support ticket for you now. An agent will be with you shortly. You can track this in your Support Dashboard."
            };
        }

        // Search FAQs
        for (const faq of this.faqs) {
            if (faq.keywords.some(k => msg.includes(k))) {
                return { type: 'text', message: faq.answer };
            }
        }

        // Default response
        return {
            type: 'text',
            message: "I'm not sure I understand that. Would you like to speak with a human support agent? Just say 'Help' or 'Human'."
        };
    }

    async createHandoffTicket(userId, lastMessage) {
        const ticketData = {
            category: 'General Inquiry',
            description: `Automated handoff from AI Chat. Last user message: "${lastMessage}"`,
            status: 'Open'
        };
        return await supportService.createTicket(userId, ticketData);
    }
}

module.exports = new AIService();
