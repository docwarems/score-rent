"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Checkout = exports.checkoutSchema = void 0;
const mongoose_1 = require("mongoose");
require("dotenv").config();
exports.checkoutSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
    },
    scoreId: {
        type: String,
        required: true,
    },
    checkoutTimestamp: {
        type: String,
        required: false,
    },
    checkoutComment: {
        type: String,
        required: false,
    },
    checkinTimestamp: {
        type: String,
        required: false,
    },
    checkinComment: {
        type: String,
        required: false,
    },
});
exports.Checkout = (0, mongoose_1.model)("Checkout", exports.checkoutSchema);
