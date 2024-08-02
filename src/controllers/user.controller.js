import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

export {registerUser}