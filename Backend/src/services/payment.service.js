import Razorpay from "razorpay";
import { config } from "../config/config.js";

const razorpay = new Razorpay({
    key_id: config.RAZOR_PAY_KEY_ID,
    key_secret: config.RAZOR_PAY_KEY_SECRET
})

export const createOrder = async({amount, currency="INR"}) =>{
    const options={
        amount: amount*100,
        currency,
    }

    const order = await razorpay.orders.create(options);
    return order;

}
