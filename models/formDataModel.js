import mongoose from "mongoose";

const formDataSchema = new mongoose.Schema({
    cNameOrName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    }
    , read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Indexes to speed up listing/sorting and unread counts
formDataSchema.index({ createdAt: -1 });
formDataSchema.index({ read: 1, createdAt: -1 });

export default mongoose.model('FormData', formDataSchema);