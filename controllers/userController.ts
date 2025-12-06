import { checkouts } from "./scoreController";
import { SIGNATURE_ALL } from "../utils/score-utils";
import { emailQueueService } from '../utils/email-queue-utils';

module.exports.checkouts_get = async (req: any, res: any) => {
  const userId = res.locals.user.id;
  const signature = SIGNATURE_ALL.id;
  const checkedOut = false;
  const admin = false;
  await checkouts(res, signature, checkedOut, admin, userId);
};

module.exports.checkouts_post = async (req: any, res: any) => {
  const userId = res.locals.user.id;
  const admin = false;
  const { signature, checkedOut } = req.body;
  await checkouts(res, signature, checkedOut, admin, userId);
};


export const email_queue_stats_get = async (req: any, res: any) => {
  try {
    const stats = await emailQueueService.getQueueStats();
    const canSend = await emailQueueService.canSendEmail();
    
    res.json({
      ...stats,
      canSendMore: canSend,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};