
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },

        fullname: {
            type: String,
            required: true,
            trim: true,
        },

        contact: {
            type: String,
            trim: true,
            required: function () {
                return !this.googleId;
            },
        },

        password: {
            type: String,
            required: function () {
                return !this.googleId;
            },
            select: false,
        },

        role: {
            type: String,
            enum: ["buyer", "seller"],
            default: "buyer",
        },

        googleId: {
            type: String,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving.
userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

// Compare entered password with stored hash.
userSchema.methods.comparePassword = async function (password) {
    if (!this.password) {
        return false;
    }

    return bcrypt.compare(password, this.password);
};

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
