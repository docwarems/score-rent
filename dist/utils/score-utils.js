"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScoreTypes = void 0;
const Score_1 = require("../models/Score");
function getScoreTypes() {
    return __awaiter(this, void 0, void 0, function* () {
        const signatures = [{ id: "ALL", name: "Alle" }];
        const scoreTypes = yield Score_1.ScoreType.find();
        for (const scoreType of scoreTypes) {
            signatures.push({
                id: scoreType.signature,
                name: `${scoreType.composer} ${scoreType.work}`,
            });
        }
        return signatures;
    });
}
exports.getScoreTypes = getScoreTypes;
