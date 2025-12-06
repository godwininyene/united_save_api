const multer = require('multer');
const path = require('path');
const stream = require('stream');
const AppError = require('./appError');
const { cloudinary } = require('./cloudinary');

// We'll create a function to get uuid since it's now ESM
let uuidv4;

// Initialize uuid dynamically
const initializeUUID = async () => {
    if (!uuidv4) {
        const uuidModule = await import('uuid');
        uuidv4 = uuidModule.v4;
    }
    return uuidv4;
};

// Create memory storage instead of disk storage
const storage = multer.memoryStorage();

// File filter with detailed error messages (same as before)
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

// Configure multer upload with memory storage
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
            const field = err.field === 'passportPhoto' ? 'passportPhoto' : 
                         err.field === 'identityDocument' ? 'identityDocument' : 
                         err.field === 'photo' ? 'photo' : 'unknown';
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

// Function to upload buffer to Cloudinary
const uploadToCloudinary = async (buffer, fieldname, originalname) => {
    try {
        // Initialize uuid if needed
        const getUuid = await initializeUUID();
        
        // Determine folder and settings based on field name
        let folder;
        let transformation = [];
        const resourceType = originalname.toLowerCase().endsWith('.pdf') ? 'raw' : 'image';
        
        if (fieldname === 'passportPhoto') {
            folder = 'users/passports';
            transformation = [{ width: 800, height: 600, crop: 'fill' }];
        } else if (fieldname === 'identityDocument') {
            folder = 'users/identities';
            // No transformation for documents to preserve quality
        } else if (fieldname === 'photo') {
            folder = 'users/photos';
            transformation = [{ width: 500, height: 500, crop: 'fill' }];
        } else {
            folder = 'users/misc';
        }
        
        // Generate unique filename using uuid
        const uniqueFilename = `${fieldname}-${getUuid()}`;
        const ext = path.extname(originalname).toLowerCase();
        
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: uniqueFilename,
                    transformation,
                    resource_type: resourceType,
                    format: resourceType === 'raw' ? undefined : 'jpg', // Convert images to jpg
                    quality: 'auto',
                    fetch_format: 'auto',
                    tags: [fieldname, 'user_upload']
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            
            // Create buffer stream and pipe to upload stream
            const bufferStream = new stream.PassThrough();
            bufferStream.end(buffer);
            bufferStream.pipe(uploadStream);
        });
    } catch (error) {
        throw error;
    }
};

// Middleware to process uploaded files and send to Cloudinary
exports.processUploadToCloudinary = async (req, res, next) => {
    try {
        // Process single file upload
        if (req.file) {
            const result = await uploadToCloudinary(
                req.file.buffer,
                req.file.fieldname,
                req.file.originalname
            );
            
            req.file.cloudinary = {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
                width: result.width,
                height: result.height,
                resourceType: result.resource_type,
                folder: result.folder
            };
        }
        
        // Process multiple files upload
        if (req.files) {
            for (const field of Object.keys(req.files)) {
                if (req.files[field] && req.files[field][0]) {
                    const file = req.files[field][0];
                    const result = await uploadToCloudinary(
                        file.buffer,
                        file.fieldname,
                        file.originalname
                    );
                    
                    req.files[field][0].cloudinary = {
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        size: result.bytes,
                        width: result.width,
                        height: result.height,
                        resourceType: result.resource_type,
                        folder: result.folder
                    };
                }
            }
        }
        
        next();
    } catch (error) {
        next(new AppError(
            'Failed to upload to cloud storage',
            { upload: error.message },
            500
        ));
    }
};

// Middleware for handling user document uploads
exports.uploadUserDocuments = (req, res, next) => {
    const uploadMiddleware = upload.fields([
        { name: 'passportPhoto', maxCount: 1 },
        { name: 'identityDocument', maxCount: 1 }
    ]);
    
    uploadMiddleware(req, res, (err) => {
        if (err) {
            return exports.handleUploadErrors(err, req, res, next);
        }
        // Note: We'll call processUploadToCloudinary separately in the route
        next();
    });
};

// Middleware for handling user photo upload
exports.uploadUserPhoto = (req, res, next) => {
    const uploadMiddleware = upload.single('photo');
    
    uploadMiddleware(req, res, (err) => {
        if (err) {
            return exports.handleUploadErrors(err, req, res, next);
        }
        // Note: We'll call processUploadToCloudinary separately in the route
        next();
    });
};

// Optional: Delete file from Cloudinary
exports.deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true // Optional: invalidate CDN cache
        });
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw new AppError('Failed to delete file', 500);
    }
};

// Optional: Extract public ID from Cloudinary URL
exports.extractPublicIdFromUrl = (url) => {
    // Extract public ID from Cloudinary URL
    // URL format: https://res.cloudinary.com/cloudname/image/upload/v1234567890/folder/filename.jpg
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]+)?$/);
    return matches ? matches[1] : null;
};

// Combined middleware for cleaner routes
exports.uploadAndProcessUserDocuments = [
    upload.fields([
        { name: 'passportPhoto', maxCount: 1 },
        { name: 'identityDocument', maxCount: 1 }
    ]),
    exports.handleUploadErrors,
    exports.processUploadToCloudinary
];

exports.uploadAndProcessUserPhoto = [
    upload.single('photo'),
    exports.handleUploadErrors,
    exports.processUploadToCloudinary
];