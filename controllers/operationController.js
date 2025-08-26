import asyncHandler from "../utils/asyncHandler.js";
import FormData from "../models/formDataModel.js";
import AppError from "../utils/AppError.js";
import sendEmail from "../utils/emailService.js";
import CallToAction from "../models/callToAction.js";
import Blog from "../models/blogModel.js";
import dotenv from "dotenv";

import { singleFileUpload, multiFileUpload } from '../utils/sharedMethods.js';
import cloudinary from '../utils/cloudinary.js';



dotenv.config({ path: './config.env' });

const makeAForm = asyncHandler(async (req, res, next) => {
    const { cNameOrName, email, message, phone, address } = req.body;

    if (!cNameOrName || !email || !message || !phone || !address) {
        return next(new AppError("All fields are required", 400));
    }

    const newForm = await FormData.create({
        cNameOrName,
        email,
        message,
        phone,
        address
    })

    if (!newForm) {
        return next(new AppError("Failed to create form data", 500));
    }

    try {
        const receivedAt = new Date().toLocaleString();

        // Professional notification sent to site/admin
        const adminSubject = `New Form Submission: ${cNameOrName}`;
        const adminText = `A new form submission was received on ${receivedAt}.

Name/Company Name: ${cNameOrName}
Email: ${email}
Phone: ${phone}
Address: ${address}
Message: ${message}

Please review and respond as appropriate.`;
        const adminHtml = `
                        <div style="font-family: Arial, Helvetica, sans-serif; color: #333;">
                            <div style="max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e6e6e6;">
                                    <div style="background: linear-gradient(90deg,#0066cc,#00aaff); padding:20px; color:white; text-align:center;">
                                    <h2 style="margin:0;font-size:20px;">New Form Submission</h2>
                                    <div style="font-size:12px;opacity:0.9;">Received: ${receivedAt}</div>
                                </div>
                                <div style="padding:20px;background:#ffffff;">
                                    <h3 style="margin-top:0;color:#222;">Submission details</h3>
                                    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444;">
                                        <tr><td style="padding:6px 0;width:170px;font-weight:600;">Name / Company</td><td style="padding:6px 0;">${cNameOrName}</td></tr>
                                        <tr><td style="padding:6px 0;font-weight:600;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}" style="color:#0066cc;text-decoration:none;">${email}</a></td></tr>
                                        <tr><td style="padding:6px 0;font-weight:600;">Phone</td><td style="padding:6px 0;">${phone}</td></tr>
                                        <tr><td style="padding:6px 0;font-weight:600;">Address</td><td style="padding:6px 0;">${address}</td></tr>
                                    </table>

                                    <h4 style="margin-bottom:8px;margin-top:16px;color:#222;">Message</h4>
                                    <div style="padding:12px;background:#f9f9f9;border-radius:6px;border:1px solid #f0f0f0;color:#333;">${message.replace(/\n/g, '<br/>')}</div>

                                    <p style="margin-top:18px;color:#666;">Please follow up with the submitter as necessary.</p>
                                </div>
                                <div style="background:#fafafa;padding:12px 20px;text-align:center;font-size:12px;color:#888;">&copy; ${new Date().getFullYear()} kayceylon</div>
                            </div>
                        </div>
                `;

        await sendEmail({
            email: process.env.EMAIL_USER,
            subject: adminSubject,
            message: adminText,
            html: adminHtml
        });

        // Polite confirmation sent to the user who submitted the form
        const userSubject = 'Thank you for contacting us';
        const userText = `Dear ${cNameOrName},\n\nThank you for reaching out to us. We have received your message submitted on ${receivedAt} and will respond to you within 2 business days. Below is a copy of your submission:\n\nMessage: ${message}\n\nIf you need immediate assistance, please reply to this email or contact us at ${process.env.EMAIL_USER}.\n\nRegards,\nThe Team`;
        const userHtml = `
                        <div style="font-family: Arial, Helvetica, sans-serif; color:#333;">
                            <div style="max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e6e6e6;">
                                <div style="background: linear-gradient(90deg,#00aaff,#0066cc); padding:18px; color:white; text-align:center;">
                                    <h2 style="margin:0;font-size:18px;">Thank you for contacting kayceylon</h2>
                                </div>
                                <div style="padding:20px;background:#fff;">
                                    <p>Dear ${cNameOrName},</p>
                                    <p>We have received your message submitted on <strong>${receivedAt}</strong>. Our team will review your submission and respond within <strong>2 business days</strong>.</p>
                                    <h4 style="margin-bottom:8px;margin-top:12px;color:#222;">Your message</h4>
                                    <div style="padding:12px;background:#f7fbff;border-radius:6px;border:1px solid #e6f2ff;color:#333;">${message.replace(/\n/g, '<br/>')}</div>
                                    <p style="margin-top:16px;color:#666;">If you need immediate assistance, reply to this email or contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0066cc;text-decoration:none;">${process.env.EMAIL_USER}</a>.</p>
                                    <p style="margin-top:12px;">Regards,<br/><strong>kayceylon Team</strong></p>
                                </div>
                                <div style="background:#fafafa;padding:12px 20px;text-align:center;font-size:12px;color:#888;">&copy; ${new Date().getFullYear()} kayceylon</div>
                            </div>
                        </div>
                `;

        await sendEmail({
            email: email,
            subject: userSubject,
            message: userText,
            html: userHtml
        });

    } catch (err) {
        console.error(' Email send error:', err.message || err);
        return next(new AppError('Error sending email. Try again later!', 500));
    }



    res.status(201).json({
        status: "success",
        data: newForm
    });

})


const getAllForms = asyncHandler(async (req, res, next) => {
    const forms = await FormData.find().sort({ createdAt: -1 });

    res.status(200).json({
        status: "success",
        results: forms.length,
        data: forms
    });
});

const getOneForm = asyncHandler(async (req, res, next) => {
    const form = await FormData.findById(req.params.id);

    if (!form) {
        return next(new AppError("No form found with that ID", 404));
    }
    form.read = true;
    await form.save();

    res.status(200).json({
        status: "success",
        data: form
    });
});


const deleteForm = asyncHandler(async (req, res, next) => {
    const form = await FormData.findByIdAndDelete(req.params.id);

    if (!form) {
        return next(new AppError("No form found with that ID", 404));
    }



    res.status(204).json({
        status: "success",
        data: null
    });
});



const callToAction = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError("Email is required", 400));
    }

    try {
        const newCallToAction = await CallToAction.create({ email });

        if (!newCallToAction) {
            return next(new AppError("Failed to create subscription", 500));
        }

        // Send a concise, professional subscription confirmation to the user
        const subSubject = 'Subscription Confirmed — kayceylon';
        const contactEmail = process.env.EMAIL_USER || 'support@kayceylon';
        const subText = `Hello,

Thank you for subscribing to kayceylon. You have been added to our mailing list and will receive occasional, carefully selected updates about new articles, guides, and announcements.

If you would like to unsubscribe or update your preferences, please reply to this email or contact us at ${contactEmail} and we will process your request promptly.

We respect your privacy and will never share your contact information.

Sincerely,
kayceylon Team`;

        const subHtml = `
                                                <div style="font-family: Arial, Helvetica, sans-serif; color:#333; max-width:620px; margin:0 auto;">
                                                    <div style="background:linear-gradient(90deg,#0d6efd,#6610f2); padding:16px; color:#fff; text-align:center; border-radius:6px 6px 0 0;">
                                                        <h2 style="margin:0; font-size:18px;">Wellcome to Kayceylon</h2>
                                                    </div>
                                                    <div style="background:#fff; border:1px solid #e9ecef; border-top:none; padding:18px; color:#444;">
                                                        <p style="margin:0 0 12px;">Hello,</p>
                                                        <p style="margin:0 0 12px;">Thank you for subscribing to <strong>kayceylon</strong>. You have been added to our mailing list and will receive occasional, carefully selected updates about new articles, guides, and announcements.</p>
                                                        <p style="margin:0 0 12px; color:#666; font-size:14px;">To unsubscribe or change your preferences, reply to this email or contact us at <a href="mailto:${contactEmail}" style="color:#0d6efd; text-decoration:none;">${contactEmail}</a>. We will handle your request promptly.</p>
                                                        <p style="margin-top:16px;">Sincerely,<br/><strong>kayceylon Team</strong></p>
                                                    </div>
                                                    <div style="text-align:center; color:#888; font-size:12px; padding:12px 0;">&copy; ${new Date().getFullYear()} kayceylon — You are receiving this because you subscribed to kayceylon updates.</div>
                                                </div>
                                `;

        await sendEmail({
            email: email,
            subject: subSubject,
            message: subText,
            html: subHtml,
            replyTo: process.env.EMAIL_USER
        });

        res.status(201).json({
            status: "success",
            data: newCallToAction
        });
    } catch (err) {
        if (err.code === 11000) {
            return next(new AppError('Email is already subscribed', 400));
        }
        throw err;
    }

});



const makeABlog = asyncHandler(async (req, res, next) => {
    const { title, content, link } = req.body;
    if (!title || !content || !link) {
        return next(new AppError("All fields are required", 400));
    }
    // support multi-file uploads (up to 6 files) from multer.array('photos')
    let uploadResults = [];
    try {
        uploadResults = await multiFileUpload(req, 'kayceylon/blogs');
    } catch (err) {
        console.error('Error during file upload:', err);
        return next(new AppError('File upload failed', 500));
    }

    if (!uploadResults || uploadResults.length === 0) {
        return next(new AppError('At least one photo is required', 400));
    }

    const photos = uploadResults.map(r => ({ url: r.secure_url, public_id: r.public_id }));

    const newBlog = await Blog.create({
        title,
        content,
        link,
        photo: photos
    });
    if (!newBlog) {
        return next(new AppError("Failed to create blog", 500));
    }

    // Notify admin with a professional summary email
    try {
        const publishedAt = new Date().toLocaleString();
        const excerpt = (content && content.length > 300) ? `${content.slice(0, 300).trim()}...` : content;
        const adminSubject = `New Blog Published: ${title}`;
        const adminText = `A new blog post has been published.

Title: ${title}
Published: ${publishedAt}
Link: ${link}

Excerpt:
${excerpt || 'No excerpt available.'}

Please review and publish/promote as needed.`;

        const adminHtml = `
                        <div style="font-family: Arial, Helvetica, sans-serif; color:#333; max-width:700px; margin:0 auto;">
                            <div style="background:linear-gradient(90deg,#0d6efd,#6610f2);padding:18px;color:#fff;text-align:center;border-radius:6px 6px 0 0;">
                                <h1 style="margin:0;font-size:20px;">${title}</h1>
                                <div style="font-size:12px;opacity:0.9;margin-top:6px;">Published: ${publishedAt}</div>
                            </div>
                            <div style="padding:20px;background:#fff;border:1px solid #e9ecef;border-top:none;border-radius:0 0 6px 6px;">
                                <p style="color:#444;margin:0 0 12px;">A new blog post has been published. Below is a short excerpt; click the button to read the full article.</p>
                                <div style="padding:12px;background:#f8f9fa;border-radius:6px;border:1px solid #e9ecef;color:#222;margin-bottom:12px;">${excerpt ? excerpt.replace(/\n/g, '<br/>') : 'No excerpt available.'}</div>
                                <p style="text-align:center;margin:18px 0;"><a href="${link}" style="background:#0d6efd;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">View Full Article</a></p>
                                <p style="color:#6c757d;font-size:13px;margin-top:8px;">This notification was generated automatically. Reply to this email for follow-up.</p>
                            </div>
                        </div>
                `;

        await sendEmail({
            email: process.env.EMAIL_USER,
            subject: adminSubject,
            message: adminText,
            html: adminHtml
        });
    } catch (err) {
        console.error('Error sending admin blog notification:', err);
        // continue; don't block blog creation
    }

    // Notify call-to-action subscribers (send in BCC batches)
    try {
        const subscribers = await CallToAction.find().select('email -_id');
        const emails = subscribers.map(s => s.email).filter(Boolean);

        if (emails.length > 0) {
            const batchSize = 50; // send in batches of 50
            const adminSubject = `New Blog Published: ${title}`;
            const htmlBody = `
                <div style="font-family: Arial, Helvetica, sans-serif;color:#333;max-width:600px;margin:0 auto;">
                                                                <div style="background:linear-gradient(90deg,#0066cc,#00aaff);padding:16px;color:white;text-align:center;border-radius:6px 6px 0 0;">
                                        <h2 style="margin:0;font-size:18px;">${title}</h2>
                                    </div>
                  <div style="padding:18px;background:#fff;border:1px solid #e6e6e6;border-top:none;border-radius:0 0 6px 6px;">
                    <p style="color:#444;margin:0 0 12px;">A new blog post has been published. Read it here:</p>
                    <p style="margin:0 0 12px;"><a href="${link}" style="color:#0066cc;text-decoration:none;">${link}</a></p>
                    <p style="color:#666;font-size:13px;margin:12px 0 0;">You are receiving this email because you subscribed to kayceylon updates.</p>
                  </div>
                </div>
            `;

            for (let i = 0; i < emails.length; i += batchSize) {
                const batch = emails.slice(i, i + batchSize);
                await sendEmail({
                    // send to admin as primary recipient and BCC subscribers
                    email: process.env.EMAIL_USER,
                    subject: adminSubject,
                    message: `A new blog titled "${title}" has been published: ${link}`,
                    html: htmlBody,
                    bcc: batch.join(',')
                });
            }
        }
    } catch (err) {
        console.error('Error notifying subscribers:', err);
    }

    res.status(201).json({
        status: "success",
        data: newBlog
    });
})

const getAllBlogs = asyncHandler(async (req, res, next) => {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    if (!blogs) {
        return next(new AppError("No blogs found", 404));
    }
    res.status(200).json({
        status: "success",
        results: blogs.length,
        data: blogs
    });
});

const updateBlog = asyncHandler(async (req, res, next) => {
    const { title, content, link } = req.body;

    // handle multi-file upload replacement (if user provides new photos)
    let uploadResults = [];
    try {
        uploadResults = await multiFileUpload(req, 'kayceylon/blogs');
    } catch (err) {
        console.error('Error during file upload:', err);
        return next(new AppError('File upload failed', 500));
    }

    const updatedData = { title, content, link };
    if (uploadResults && uploadResults.length > 0) {
        // delete all previous images from cloudinary if exist
        try {
            const existingBlog = await Blog.findById(req.params.id).select('photo');
            if (existingBlog && Array.isArray(existingBlog.photo)) {
                for (const p of existingBlog.photo) {
                    if (p && p.public_id) {
                        await cloudinary.uploader.destroy(p.public_id);
                    }
                }
            } else if (existingBlog && existingBlog.photo && existingBlog.photo.public_id) {
                // backwards compatibility in case photo was stored as object
                await cloudinary.uploader.destroy(existingBlog.photo.public_id);
            }
        } catch (err) {
            console.error('Error deleting previous image(s) from Cloudinary:', err);
            // don't block the update for deletion errors; proceed
        }

        updatedData.photo = uploadResults.map(r => ({ url: r.secure_url, public_id: r.public_id }));
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, updatedData, {
        new: true,
        runValidators: true
    });

    if (!blog) {
        return next(new AppError("No blog found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: blog
    });
});

const deleteBlog = asyncHandler(async (req, res, next) => {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
        return next(new AppError("No blog found with that ID", 404));
    }

    // delete associated images from cloudinary if exist
    try {
        if (Array.isArray(blog.photo)) {
            for (const p of blog.photo) {
                if (p && p.public_id) {
                    await cloudinary.uploader.destroy(p.public_id);
                }
            }
        } else if (blog.photo && blog.photo.public_id) {
            await cloudinary.uploader.destroy(blog.photo.public_id);
        }
    } catch (err) {
        console.error('Error deleting image(s) from Cloudinary:', err);
        // don't block the deletion for image deletion errors; proceed
    }

    res.status(204).json({
        status: "success",
        data: null
    });
});


const getOneBlog = asyncHandler(async (req, res, next) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
        return next(new AppError("No blog on that ID", 400))
    };

    res.status(200).json({
        status: "success",
        data: blog
    })
})


export { makeAForm, getAllForms, getOneForm, deleteForm, callToAction, makeABlog, getAllBlogs, updateBlog, deleteBlog, getOneBlog }
