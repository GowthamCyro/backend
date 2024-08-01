import dotenv from "dotenv";
dotenv.config({
    path : "./env"
})


import { connectDB } from "./db/database.connection.js";

import {app} from "./app.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 5000,()=>{
        console.log(`server is running at port ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log(`MongoDB connection Failed : ${err}`);
})

