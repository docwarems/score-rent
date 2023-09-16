import { checkouts } from "./scoreController";

module.exports.checkouts_get = async (req: any, res: any) => {
  const userId = res.locals.user.id;
  const signature = "ALL";
  const checkedOut = "true";
  const admin = false;
  await checkouts(res, signature, checkedOut, admin, userId);
};

module.exports.checkouts_post = async (req: any, res: any) => {
  const userId = res.locals.user.id;
  const admin = false;
  const { signature, checkedOut } = req.body;
  await checkouts(res, signature, checkedOut, admin, userId);
};
