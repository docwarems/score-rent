"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreType = void 0;
const mongoose_1 = require("mongoose");
const { isEmail } = require("validator");
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
exports.ScoreType = (0, mongoose_1.model)("ScoreType", scoreTypeSchema);
