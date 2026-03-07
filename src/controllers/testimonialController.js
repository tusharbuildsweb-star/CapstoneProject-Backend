const Testimonial = require('../models/Testimonial');

exports.getAllTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ date: -1 });
        res.json(testimonials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addTestimonial = async (req, res) => {
    try {
        const testimonial = new Testimonial(req.body);
        const saved = await testimonial.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
