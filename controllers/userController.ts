import { checkouts_vue } from "./adminController";
import { getScoreTypes, SIGNATURE_ALL } from "../utils/score-utils";

module.exports.checkouts_get = async (req: any, res: any) => {
  res.render("checkouts-vue", {
    admin: false,
    signatures: JSON.stringify(await getScoreTypes()),
    filter: JSON.stringify({ signature: SIGNATURE_ALL.id, checkedOut: false }),
    checkouts: undefined,
    error: undefined,
    hasError: false,
    checkoutsApiPath: "/user/checkouts",
  });
};

module.exports.checkouts_post = async (req: any, res: any) => {
  const userId = res.locals.user.id;
  const admin = false;
  const { signature, checkedOut } = req.body;
  await checkouts_vue(res, signature, checkedOut, admin, userId);
};
