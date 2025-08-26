import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png' && ext !== '.webp') {
        cb(new Error('Only JPG, JPEG, PNG, and WebP images are allowed'), false);
    } else {
        cb(null, true);
    }
};

const upload = multer({ storage, fileFilter });

export default upload;