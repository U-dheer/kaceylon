import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true,
    },
    content: {
        type: String,
        required: [true, 'Please provide content for the blog post'],
        minlength: [10, 'Content must be at least 10 characters'],
    },
    link: {
        type: String,
        required: [true, 'Please provide a link for the blog post']
    },
    photo: {
        type: [new Schema({
            url: { type: String, required: [true, 'Please provide a photo URL for the blog post'] },
            public_id: { type: String }
        }, { _id: false })],
        required: [true, 'Please provide at least one photo for the blog post'],
        validate: {
            validator: function (val) {
                return Array.isArray(val) && val.length >= 1 && val.length <= 6;
            },
            message: 'Please provide between 1 and 6 photos'
        }
    }
}, { timestamps: true });

// Index for sorting by newest first
blogSchema.index({ createdAt: -1 });

export default mongoose.model('Blog', blogSchema);