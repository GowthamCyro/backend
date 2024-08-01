import mongoose  from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({   
    videoFile : {
        type : String, // cloudinary url
        required : [true,"Bhai video upload karde"],
    },
    thumbnail : {
        type : String, // cloudinary url
        required : true
    },
    title : {
        type : String, 
        required : true
    },
    description : {
        type : String, 
        required : true
    },
    duration : {
        type : Number, // cloudinary gives number which is time of video uploaded  
        required : true
    },
    views : {
        type : Number, 
        default : 0
    },
    isPublished : {
        type : Boolean,
        default : true
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }
},{timestamps:true})


mongoose.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video",videoSchema);
