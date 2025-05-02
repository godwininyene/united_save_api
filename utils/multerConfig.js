const multer = require('multer');
const path = require('path');
const AppError = require('./appError');

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'passportPhoto') {
            cb(null, 'public/uploads/users/passports');
        } else if (file.fieldname === 'identityDocument') {
            cb(null, 'public/uploads/users/identities');
        }else if (file.fieldname === 'photo') {
            cb(null, 'public/uploads/users/photos');
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter with detailed error messages
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedDocumentTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    if (file.fieldname === 'passportPhoto' || file.fieldname === 'photo') {
        if (!allowedImageTypes.includes(file.mimetype)) {
            const field = `${file.fieldname === 'passportPhoto' ? 'passportPhoto' :'photo'}`
            return cb(new AppError(
                'Invalid file type', 
                { [field]: `${file.fieldname === 'passportPhoto' ? 'Passport' :'photo'} must be an image (JPEG, PNG, GIF)` }, 
                400
            ), false);
        }
    } else if (file.fieldname === 'identityDocument') {
        if (!allowedDocumentTypes.includes(file.mimetype)) {
            return cb(new AppError(
                'Invalid file type', 
                { identityDocument: 'Document must be an image (JPEG, PNG, GIF) or PDF file' }, 
                400
            ), false);
        }
    }
    
    cb(null, true);
};

// Configure multer upload
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Enhanced error handling middleware
exports.handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            // Determine which field exceeded size limit
            const field = err.field === 'passportPhoto' ? 'passportPhoto' : 'identityDocument';
            return next(new AppError(
                'File too large',
                { [field]: 'File size too large. Max 5MB allowed' },
                400
            ));
        }
        // Handle other multer errors
        return next(new AppError(
            'File upload error',
            { [err.field]: err.message },
            400
        ));
    } else if (err instanceof AppError) {
        // Already formatted AppError
        return next(err);
    }
    // Unknown error
    next(err);
};

// Middleware for handling user document uploads
exports.uploadUserDocuments = upload.fields([
    { name: 'passportPhoto', maxCount: 1 },
    { name: 'identityDocument', maxCount: 1 }
]);
exports.uploadUserPhoto = upload.single('photo');