import express from 'express';
import * as authController from '../controllers/authController.js';
import * as operationController from '../controllers/operationController.js';
import upload from '../utils/multer.js';

const router = express.Router();


router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.verifyRefreshToken, authController.refreshToken);
router.post('/logout', authController.protect, authController.logout);


router.post('/makeAForm', operationController.makeAForm);
router.get('/getAllForms', authController.protect, authController.authorize('admin'), operationController.getAllForms);
router.get('/getOneForm/:id', authController.protect, authController.authorize('admin'), operationController.getOneForm);
router.delete('/deleteForm/:id', authController.protect, authController.authorize('admin'), operationController.deleteForm);


router.post('/callToAction', operationController.callToAction);


router.post('/makeABlog', authController.protect, upload.array('photos', 6), authController.authorize('admin'), operationController.makeABlog);
router.get('/getAllBlogs', operationController.getAllBlogs);
router.patch('/updateBlog/:id', authController.protect, upload.array('photos', 6), authController.authorize('admin'), operationController.updateBlog);
router.delete('/deleteBlog/:id', authController.protect, authController.authorize('admin'), operationController.deleteBlog);
router.get('/getOneBlog/:id', operationController.getOneBlog);
export default router;
