import mongoos from "mongoose";
import { DB_NAME } from "../constants.js";
import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const connect = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB Connected !! DB HOST : ${connect.connection.host}`);
    } catch (error) {
        console.log("Mongo DB connection error",error);
        process.exit(1);
    }
}