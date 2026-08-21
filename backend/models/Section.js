import { Timestamp } from "mongodb";
import mongoose from "mongoose";
const sectionSchema=new mongoose.Schema({
    sectionId:{type:String,required:true,unique:true},
    sectionName:{type:String,default:"Custom"},
    pageName:{type:String,default:"Home"},
    platform:{type:String,default:"website"},
    isGenerated:{type:Boolean,default:true},
    variations:{type:String,default:"1"},
    cardGridColumns:{type:Number,default:3},
},{Timestamp:true});

export default mongoose.model('Section',sectionSchema);