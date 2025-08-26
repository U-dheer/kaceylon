import cloudinary from '../utils/cloudinary.js';
import AppError from './AppError.js';

export async function singleFileUpload(req, folder) {
    if (req.file && req.file.buffer) {
        try {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder },
                    (error, result) => {
                        if (error) {
                            reject(new AppError('Photo upload failed', 500));
                        } else {
                            resolve(result);
                        }
                    }
                );
                stream.end(req.file.buffer);
            });
        } catch (error) {
            throw new AppError('Photo upload failed', 500);
        }
    }
    return undefined;
}



export async function multiFileUpload(req, folder) {
    if (req.files && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map(file => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder },
                        (error, result) => {
                            if (error) reject(new AppError('Multi-photo upload failed', 500));
                            else resolve(result);
                        }
                    );
                    stream.end(file.buffer);
                });
            });
            return await Promise.all(uploadPromises);
        } catch (error) {
            throw new AppError('Multi-photo upload failed', 500);
        }
    }
    return [];
}