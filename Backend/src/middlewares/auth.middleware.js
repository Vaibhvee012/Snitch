 import jwt from "jsonwebtoken"
 import {config} from "../config/config.js"
 import UserModel from "../models/user.model.js"

 export const authenticateSeller = async (req,res,next)=>{
    const token = req.cookies.token

    if(!token){
        return res.status(401).json({message:"Uauthorized"})
    }

    try{
        const decoded = jwt.verify(token, config.JWT_SECRET)

        const user = await User.findById(decoded.id)

        if(!user){
            return res.status(401).json({message: "Unauthorized"})
        }
        if(user.role !== "seller"){
            return res.status(403).json({message:"Forbidden"})
        }

        req.user = user
        next()
    } catch(err){
        console.log(err)
        return res.status(401).json({message: "Unauthorized"})
    }
 }