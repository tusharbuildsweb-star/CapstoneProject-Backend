const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, default: 'Diner' },
    location: { type: String },
    image: { type: String, default: 'https://randomuser.me/api/portraits/men/32.jpg' },
    content: { type: String, required: true },
    rating: { type: Number, default: 5 },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
