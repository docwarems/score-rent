"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Score = exports.ScoreType = void 0;
const mongoose_1 = require("mongoose");
const Checkout_1 = require("./Checkout");
require("dotenv").config();
const scoreTypeSchema = new mongoose_1.Schema({
    composer: {
        type: String,
        required: [true, "Bitte Komponist angeben"],
        unique: true,
    },
    work: {
        type: String,
        required: [true, "Bitte Werk angeben"],
    },
    signature: {
        type: String,
        required: [true, "Bitte Signatur angeben"],
        uppercase: true,
        unique: true,
    },
    count: {
        type: Number,
        required: [true, "Bitte Anzahl angeben"],
    },
});
const scoreSchema = new mongoose_1.Schema({
    signature: {
        type: String,
        required: [true, "Bitte Signatur angeben"],
        uppercase: true,
    },
    id: {
        type: String,
        unique: true,
        required: true,
        uppercase: true,
    },
    extId: {
        type: String,
    },
    state: {
        type: String,
    },
    checkedOutByUserId: {
        type: String,
    },
    checkouts: {
        type: [Checkout_1.checkoutSchema],
    }
});
exports.ScoreType = (0, mongoose_1.model)("ScoreType", scoreTypeSchema);
exports.Score = (0, mongoose_1.model)("Score", scoreSchema);
