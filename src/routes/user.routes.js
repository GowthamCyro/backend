import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// router.route("/register").post(registerUser); without middleware for uploading

// with middleware
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// Secured Routes

router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/changePassword").post(verifyJWT,changeCurrentPassword);
router.route("/getUserDetails").post(verifyJWT,getCurrentUser);
router.route("/updateAccountDetails").post(verifyJWT,updateAccountDetails);
router.route("/updateAvatar").post(verifyJWT,
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        }
    ]),updateUserAvatar);
router.route("/updateCoverImage").post(verifyJWT,
    upload.fields([
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),updateUserCoverImage);


export default router