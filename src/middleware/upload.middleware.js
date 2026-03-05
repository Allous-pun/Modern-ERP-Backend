// src/middleware/upload.middleware.js
const { upload } = require('../config/cloudinary');

// Middleware for single file upload
const uploadSingle = (fieldName) => {
    return (req, res, next) => {
        const singleUpload = upload.single(fieldName);
        singleUpload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    };
};

// Middleware for multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
    return (req, res, next) => {
        const multipleUpload = upload.array(fieldName, maxCount);
        multipleUpload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    };
};

module.exports = {
    uploadSingle,
    uploadMultiple
};