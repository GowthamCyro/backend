import { v2 as cloudinary } from 'cloudinary';
import exp from 'constants';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (filePath) => {
    try {
        if(!filePath) return null
        const response = await cloudinary.uploader.upload(filePath,{resource_type : 'auto'})
        console.log("File uploaded successfully",response.url);
        return response
    } catch (error) {
        fs.unlinkSync(filePath); // remove the locally saved file which can be malicious
        return null;
    }
}

export {uploadOnCloudinary}
