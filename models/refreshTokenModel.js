import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better query performance
// Note: `token` has `unique: true` on the field definition, which creates an index.
// Removing the explicit index declaration for `token` to avoid duplicate index warnings.
refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ expiresAt: 1 });

// Method to check if token is expired
refreshTokenSchema.methods.isExpired = function () {
    return Date.now() >= this.expiresAt;
};

// Method to revoke token
refreshTokenSchema.methods.revoke = function () {
    this.isRevoked = true;
    return this.save();
};

// Static method to create refresh token
refreshTokenSchema.statics.createToken = async function (userId, token, expiresIn) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return await this.create({
        token,
        user: userId,
        expiresAt
    });
};

// Static method to find valid token
refreshTokenSchema.statics.findValidToken = async function (token) {
    return await this.findOne({
        token,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).populate('user');
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
    return await this.updateMany(
        { user: userId, isRevoked: false },
        { isRevoked: true }
    );
};

// Static method to revoke specific token
refreshTokenSchema.statics.revokeToken = async function (token) {
    return await this.findOneAndUpdate(
        { token },
        { isRevoked: true },
        { new: true }
    );
};

// Clean up expired tokens (can be called periodically)
refreshTokenSchema.statics.cleanupExpired = async function () {
    return await this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

export default mongoose.model('RefreshToken', refreshTokenSchema);
