import dotenv from "dotenv";
dotenv.config({
    path : "./env"
})

import mongoose  from "mongoose";
import express from "express";
import { connectDB } from "./db/database.connection.js";

connectDB();

