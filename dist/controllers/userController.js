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
const scoreController_1 = require("./scoreController");
const score_utils_1 = require("../utils/score-utils");
module.exports.checkouts_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = res.locals.user.id;
    const signature = score_utils_1.SIGNATURE_ALL.id;
    const checkedOut = true;
    const admin = false;
    yield (0, scoreController_1.checkouts)(res, signature, checkedOut, admin, userId);
});
module.exports.checkouts_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = res.locals.user.id;
    const admin = false;
    const { signature, checkedOut } = req.body;
    yield (0, scoreController_1.checkouts)(res, signature, checkedOut, admin, userId);
});
