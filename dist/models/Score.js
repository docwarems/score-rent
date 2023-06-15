"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Score = void 0;
const mongoose_1 = require("mongoose");
const { isEmail } = require("validator");
require("dotenv").config();
const scoreSchema = new mongoose_1.Schema({
    composer: {
        type: String,
        required: [true, "Bitte Komponist angeben"],
        unique: true,
    },
    work: {
        type: String,
        required: [true, "Bitte Werk angeben"],
        unique: true,
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
exports.Score = (0, mongoose_1.model)("Score", scoreSchema);
