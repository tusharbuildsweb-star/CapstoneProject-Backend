const OwnerApplication = require('../models/OwnerApplication');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const ownerService = require('../services/ownerService');

// @desc    Submit owner application
// @route   POST /api/v1/owner/apply
// @access  Public
const submitApplication = async (req, res, next) => {
    try {
        const { ownerName, email, phone, restaurantName, location, cuisine, description, tables } = req.body;

        let facilities = req.body.facilities;
        if (typeof facilities === 'string') {
            facilities = facilities.split(',').map(f => f.trim()).filter(f => f);
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => `/uploads/restaurants/${file.filename}`);
        } else if (req.body.images && typeof req.body.images === 'string') {
            images = req.body.images.split(',').map(i => i.trim()).filter(i => i);
        }

        // Check if application already exists by email
        const existingApp = await OwnerApplication.findOne({ email: email.toLowerCase() });
        if (existingApp) {
            return res.status(400).json({ message: 'An application with this email has already been submitted.' });
        }

        const newApplication = new OwnerApplication({
            ownerName,
            email,
            phone,
            restaurantName,
            location,
            cuisine,
            description,
            tables,
            facilities,
            images
        });

        const savedApplication = await newApplication.save();

        // 5. OPTIONAL: Send acknowledgment email
        try {
            await sendEmail({
                email: email,
                subject: 'Application Received – RESERVE Partner Program',
                message: `Dear ${ownerName},\n\nWe have successfully received your restaurant application.\n\nOur team will review it shortly. Once approved, you will receive your dashboard login credentials via email.\n\nIf you do not see our email, please check your Spam folder.\n\nRegards,\nRESERVE Team`
            });
        } catch (emailError) {
            console.error('Failed to send acknowledgment email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully. Await admin approval.'
        });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

// @desc    Get current user's application status
// @route   GET /api/v1/owner/status
// @access  Private
const getApplicationStatus = async (req, res, next) => {
    try {
        const application = await OwnerApplication.findOne({ userId: req.user._id });
        if (!application) {
            return res.status(404).json({ message: 'No application found' });
        }
        res.json(application);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all owner applications (Admin)
// @route   GET /api/v1/admin/owner-applications
// @access  Private/Admin
const getAllApplications = async (req, res, next) => {
    try {
        const applications = await OwnerApplication.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (error) {
        next(error);
    }
};

// @desc    Approve owner application (Admin)
// @route   PUT /api/v1/admin/owner/:id/approve
// @access  Private/Admin
const approveApplication = async (req, res, next) => {
    try {
        const application = await OwnerApplication.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status === 'approved') {
            return res.status(400).json({ message: 'Application is already approved' });
        }

        // 1. Check or Create associated User account
        let user = await User.findOne({ email: application.email });
        let generatedPassword = null;
        let isNewUser = false;

        if (!user) {
            // Generate an 8 character secure password
            generatedPassword = crypto.randomBytes(4).toString('hex');
            user = new User({
                name: application.ownerName,
                email: application.email,
                password: generatedPassword,
                role: 'owner',
                mustChangePassword: true
            });
            await user.save();
            isNewUser = true;
        } else {
            // If they happen to exist, just upgrade them
            user.role = 'owner';
            // We don't force password change if they are an existing user who likely knows their password
            await user.save();
        }

        // Lock user reference into app model
        application.userId = user._id;
        application.status = 'approved';
        await application.save();

        // 2. Automatically create a draft restaurant
        const newRestaurant = new Restaurant({
            ownerId: user._id,
            name: application.restaurantName,
            location: application.location,
            cuisine: application.cuisine,
            description: application.description,
            priceRange: '₹₹',
            isApproved: true,
            crowdLevel: 'Normal',
            tables: application.tables || 10,
            facilities: application.facilities || [],
            images: application.images || []
        });

        await newRestaurant.save();

        // 3. Send email to the owner
        if (isNewUser && generatedPassword) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0;">Application Approved!</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="font-size: 16px; color: #333;">Hello,</p>
                        <p style="font-size: 16px; color: #333;">Great news! Your application to partner with RESERVE for <strong>${application.restaurantName}</strong> has been reviewed and approved by our administration team.</p>
                        
                        <div style="background-color: #f9fafb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #1f2937;">Your Dashboard Login Credentials</h3>
                            <p style="margin: 5px 0;"><strong>Login Email:</strong> ${application.email}</p>
                            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; letter-spacing: 1px;">${generatedPassword}</span></p>
                        </div>
                        
                        <p style="font-size: 16px; color: #333;">Please log in to your Owner Dashboard to manage your restaurant profile, view reservations, and set up your availability.</p>
                        <p style="font-size: 14px; color: #666; margin-top: 30px;"><em>Instruction: We highly recommend changing your password immediately after your first login.</em></p>
                    </div>
                    <div style="background-color: #1f2937; color: #9ca3af; text-align: center; padding: 15px; font-size: 12px;">
                        &copy; ${new Date().getFullYear()} RESERVE. All rights reserved.
                    </div>
                </div>
            `;

            await sendEmail({
                to: application.email,
                subject: `Welcome to RESERVE - Your Partner Account Details for ${application.restaurantName}`,
                html: emailHtml
            });
        }

        res.json({ message: 'Application approved, user upgraded/created, restaurant created.', application });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

// @desc    Reject owner application (Admin)
// @route   PUT /api/v1/admin/owner/:id/reject
// @access  Private/Admin
const rejectApplication = async (req, res, next) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'Rejection reason is mandatory' });
        }

        const application = await OwnerApplication.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        application.status = 'rejected';
        application.rejectionReason = reason;
        await application.save();

        // Send email via SendGrid
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">Application Update – Not Approved</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 16px; color: #333;">Hello ${application.ownerName},</p>
                    <p style="font-size: 16px; color: #333;">We regret to inform you that your restaurant application for <strong>${application.restaurantName}</strong> has been rejected.</p>
                    
                    <div style="background-color: #f9fafb; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Reason for Rejection:</h3>
                        <p style="margin: 5px 0; color: #374151;">${reason}</p>
                    </div>
                    
                    <p style="font-size: 16px; color: #333;">You may reapply after addressing the issue mentioned above.</p>
                </div>
                <div style="background-color: #1f2937; color: #9ca3af; text-align: center; padding: 15px; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} RESERVE Team. All rights reserved.
                </div>
            </div>
        `;

        await sendEmail({
            to: application.email,
            subject: 'Application Update – Not Approved',
            html: emailHtml
        });

        res.json({ message: 'Application rejected and owner notified.', application });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const getAnalytics = async (req, res, next) => {
    try {
        const data = await ownerService.getAnalytics(req.user._id);
        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

module.exports = {
    submitApplication,
    getApplicationStatus,
    getAllApplications,
    approveApplication,
    rejectApplication,
    getAnalytics
};
