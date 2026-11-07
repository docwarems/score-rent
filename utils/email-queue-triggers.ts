import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  SchedulerClient,
  UpdateScheduleCommand,
} from "@aws-sdk/client-scheduler";

const lambdaClient = new LambdaClient({});
const schedulerClient = new SchedulerClient({});
const workerArn = process.env.EMAIL_QUEUE_WORKER_ARN!;
const schedulerRoleArn = process.env.EMAIL_QUEUE_SCHEDULER_ROLE_ARN!;
const scheduleName = `email-queue-resume-${process.env.STAGE || "dev"}`;

export async function triggerEmailQueueWorker() {
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }

  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: workerArn,
      InvocationType: "Event",
    })
  );
}

export async function continueEmailQueueAt(runAt: Date | null) {
  if (!runAt) {
    await deleteScheduledResume();
    return;
  }

  if (runAt.getTime() <= Date.now()) {
    await deleteScheduledResume();
    await triggerEmailQueueWorker();
    return;
  }

  const scheduledAt = new Date(Math.ceil(runAt.getTime() / 60_000) * 60_000);
  const input = {
    Name: scheduleName,
    GroupName: "default",
    ScheduleExpression: `at(${scheduledAt.toISOString().slice(0, 19)})`,
    ScheduleExpressionTimezone: "UTC",
    FlexibleTimeWindow: { Mode: "OFF" as const },
    ActionAfterCompletion: "DELETE" as const,
    Target: {
      Arn: workerArn,
      RoleArn: schedulerRoleArn,
      Input: "{}",
    },
  };

  try {
    await schedulerClient.send(new CreateScheduleCommand(input));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "ConflictException") {
      throw error;
    }
    await schedulerClient.send(new UpdateScheduleCommand(input));
  }
}

async function deleteScheduledResume() {
  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: "default",
      })
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.name !== "ResourceNotFoundException"
    ) {
      throw error;
    }
  }
}
