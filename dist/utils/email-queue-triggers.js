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
exports.continueEmailQueueAt = exports.triggerEmailQueueWorker = void 0;
const client_lambda_1 = require("@aws-sdk/client-lambda");
const client_scheduler_1 = require("@aws-sdk/client-scheduler");
const lambdaClient = new client_lambda_1.LambdaClient({});
const schedulerClient = new client_scheduler_1.SchedulerClient({});
const workerArn = process.env.EMAIL_QUEUE_WORKER_ARN;
const schedulerRoleArn = process.env.EMAIL_QUEUE_SCHEDULER_ROLE_ARN;
const scheduleName = `email-queue-resume-${process.env.STAGE || "dev"}`;
function triggerEmailQueueWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
            return;
        }
        yield lambdaClient.send(new client_lambda_1.InvokeCommand({
            FunctionName: workerArn,
            InvocationType: "Event",
        }));
    });
}
exports.triggerEmailQueueWorker = triggerEmailQueueWorker;
function continueEmailQueueAt(runAt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!runAt) {
            yield deleteScheduledResume();
            return;
        }
        if (runAt.getTime() <= Date.now()) {
            yield deleteScheduledResume();
            yield triggerEmailQueueWorker();
            return;
        }
        const scheduledAt = new Date(Math.ceil(runAt.getTime() / 60000) * 60000);
        const input = {
            Name: scheduleName,
            GroupName: "default",
            ScheduleExpression: `at(${scheduledAt.toISOString().slice(0, 19)})`,
            ScheduleExpressionTimezone: "UTC",
            FlexibleTimeWindow: { Mode: "OFF" },
            ActionAfterCompletion: "DELETE",
            Target: {
                Arn: workerArn,
                RoleArn: schedulerRoleArn,
                Input: "{}",
            },
        };
        try {
            yield schedulerClient.send(new client_scheduler_1.CreateScheduleCommand(input));
        }
        catch (error) {
            if (!(error instanceof Error) || error.name !== "ConflictException") {
                throw error;
            }
            yield schedulerClient.send(new client_scheduler_1.UpdateScheduleCommand(input));
        }
    });
}
exports.continueEmailQueueAt = continueEmailQueueAt;
function deleteScheduledResume() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield schedulerClient.send(new client_scheduler_1.DeleteScheduleCommand({
                Name: scheduleName,
                GroupName: "default",
            }));
        }
        catch (error) {
            if (!(error instanceof Error) ||
                error.name !== "ResourceNotFoundException") {
                throw error;
            }
        }
    });
}
