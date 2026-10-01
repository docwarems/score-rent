import mongoose from "mongoose";
import { emailQueueService } from "./utils/email-queue-utils";
import {
  continueEmailQueueAt,
  triggerEmailQueueWorker,
} from "./utils/email-queue-triggers";
import { getEnvVar } from "./utils/misc-utils";

let connection: Promise<typeof mongoose> | null = null;

async function connect() {
  if (!connection) {
    connection = mongoose
      .connect(getEnvVar("MONGODB_URL"), { serverSelectionTimeoutMS: 5000 })
      .catch((error) => {
        connection = null;
        throw error;
      });
  }

  return connection;
}

export const handler = async () => {
  await connect();
  const result = await emailQueueService.processQueue();
  const nextProcessingTime = await emailQueueService.getNextProcessingTime();

  console.log("Email queue worker completed:", {
    ...result,
    nextProcessingTime,
  });

  if (nextProcessingTime && nextProcessingTime.getTime() <= Date.now()) {
    await triggerEmailQueueWorker();
  } else {
    await continueEmailQueueAt(nextProcessingTime);
  }

  return result;
};
