import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

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
            $set : {
                refreshToken : undefined
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

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}