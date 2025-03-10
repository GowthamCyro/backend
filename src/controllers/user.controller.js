import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave : false })

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // res.status(200).json({
    //     message : "chai is love"
    // })
 
    // Register User - Logic.
    // get user details from frontend
    // validation - not empty feilds in the data for the reqired one
    // check if user already exists : username,email
    // check for images , check for avatar
    // upload them for cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token feild from response
    // check for user creation
    // return res

    const {email,password,fullname,username} = req.body
    if([email,password,fullname,username].some((field)=> field?.trim() === ""))
    {
        throw new ApiError(400,"Give the full name");
    }

    const existedUser = await User.findOne({
        $or : [ { email }, { username }]
    })

    if(existedUser) {
        throw new ApiError(409,"User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) &&req.files.coverImage.length>0)
    {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})

const loginUser = asyncHandler( async(req,res) => {

    // login with email and password
    // check if the inputs are null or not
    // validate if user exists 
    // if your exists generate a access token and refresh token for the user and return access token
    // if not exists throw Api Error usernot exists or password not match with the username

    const {username,email,password} = req.body

    if(!email && !username){
        throw new ApiError(404,"Username or Email should not be empty");
    }

    const user = await User.findOne({$or:[{username},{email}]})

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {  // using for cookies
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User Logged in Successfully"
        )
    )

})

const logoutUser = asyncHandler( async(req,res) =>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset : {
                refreshToken : 1
            } 
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully" ))
})

const refreshAccessToken = asyncHandler( async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodeToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodeToken._id);
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken )
        {
            throw new ApiError(401,"Refresh Token Expired")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);
        
        console.log(refreshToken);

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken
                },
                "New tokens generated"
            )
        )
    } 
    catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token");
    }

})

const changeCurrentPassword = asyncHandler( async(req,res) => {

    const {oldPassword , newPassword } = req.body

    const user = await User.findById(req.user?._id);

    const isCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isCorrect){
        throw new ApiError(401,"Invalid Password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave:false });

    return res
    .status(200)
    .json(new ApiResponse(200,{user},"Password Changed Successfully"))
})

const getCurrentUser = asyncHandler( async(req,res) => {

    const user = req.user;
    return res
    .status(200)
    .json(new ApiResponse(200,{user},"This is the loggedIn user data"));
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname,email,} = req.body

    if(!fullname && !email){
        throw new ApiError(401,"FullName or Email should be given");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : { 
                $or:{fullname : fullname , email : email}
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,{user},"Account Details updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarFilePath = req.file?.path;

    if(!avatarFilePath){
        throw new ApiError(401,"Image not Found");
    }

    const avatar = await uploadOnCloudinary(avatarFilePath);

    if(!avatar){
        throw new ApiError(401,"something went wrong while uploading on cloudinary");
    }

    // TODO delete old image in cloudinary

    const user = await User.findByIdAndDelete(
        req.user?._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")
    
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar Changed Successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageFilePath = req.file?.path;

    if(!coverImageFilePath){
        throw new ApiError(401,"Image not Found");
    }

    const coverImage = await uploadOnCloudinary(coverImageFilePath);

    if(!coverImage){
        throw new ApiError(401,"something went wrong while uploading on cloudinary");
    }

    // TODO delete old image in cloudinary

    const user = await User.findByIdAndDelete(
        req.user?._id,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,{user},"CoverImage Changed Successfully"))
})

const getUserChannelProfile = asyncHandler( async(req,res) => {
    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match : 
            {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : 
            {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : 
            {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subcriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : 
            {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond: {
                        if : { $in : [req.user?._id,"$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : 
            {
                fullname : 1,
                username : 1,
                subscribersCount : 1,
                channelsSubscribedCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }

    // console.log(channel);

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User Channel Fetched Successfully"))

})

const getWatchHistory = asyncHandler( async(req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullname : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History Fetched Successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}