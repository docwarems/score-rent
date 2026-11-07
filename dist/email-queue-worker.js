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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const email_queue_utils_1 = require("./utils/email-queue-utils");
const email_queue_triggers_1 = require("./utils/email-queue-triggers");
const misc_utils_1 = require("./utils/misc-utils");
let connection = null;
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!connection) {
            connection = mongoose_1.default
                .connect((0, misc_utils_1.getEnvVar)("MONGODB_URL"), { serverSelectionTimeoutMS: 5000 })
                .catch((error) => {
                connection = null;
                throw error;
            });
        }
        return connection;
    });
}
const handler = () => __awaiter(void 0, void 0, void 0, function* () {
    yield connect();
    const result = yield email_queue_utils_1.emailQueueService.processQueue();
    const nextProcessingTime = yield email_queue_utils_1.emailQueueService.getNextProcessingTime();
    console.log("Email queue worker completed:", Object.assign(Object.assign({}, result), { nextProcessingTime }));
    if (nextProcessingTime && nextProcessingTime.getTime() <= Date.now()) {
        yield (0, email_queue_triggers_1.triggerEmailQueueWorker)();
    }
    else {
        yield (0, email_queue_triggers_1.continueEmailQueueAt)(nextProcessingTime);
    }
    return result;
});
exports.handler = handler;
