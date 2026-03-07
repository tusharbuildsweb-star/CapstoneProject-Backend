const mongoose = require('mongoose');

const ownerApplicationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // Made optional to support public submissions without login
        },
        ownerName: {
            type: String,
            required: [true, 'Owner name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email address is required'],
            match: [/.+\@.+\..+/, 'Please provide a valid email address'],
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        restaurantName: {
            type: String,
            required: [true, 'Restaurant name is required'],
            trim: true,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
        },
        cuisine: {
            type: String,
            required: [true, 'Cuisine is required'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        tables: {
            type: Number,
            required: [true, 'Number of tables is required'],
            min: [1, 'Must have at least 1 table'],
            default: 10,
        },
        facilities: [{
            type: String,
        }],
        images: [{
            type: String,
        }],
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        rejectionReason: {
            type: String,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

const OwnerApplication = mongoose.model('OwnerApplication', ownerApplicationSchema);

module.exports = OwnerApplication;
