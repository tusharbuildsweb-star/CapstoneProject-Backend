const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const restaurantsDir = path.join(uploadDir, 'restaurants');
const profilesDir = path.join(uploadDir, 'profiles');
const ticketsDir = path.join(uploadDir, 'tickets');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(restaurantsDir)) {
    fs.mkdirSync(restaurantsDir, { recursive: true });
}
if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
}
if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
}

// Set up Multer storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Decide where to put based on fieldname or route, default to restaurants
        let folder = restaurantsDir;
        if (file.fieldname === 'profileImage') {
            folder = profilesDir;
        } else if (file.fieldname === 'ticketImage') {
            folder = ticketsDir;
        }
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        // Provide a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
    }
});

module.exports = {
    upload
};
