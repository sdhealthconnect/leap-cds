const { validateSlsHookRequest } = require("../lib/validators");
const { labelBundleDiff } = require("../lib/labeling/labeler");
const {
  resourcesToHookResponse
} = require("../lib/labeling/sls-decision-hooks-response");

async function post(req, res, next) {
  try {
    validateSlsHookRequest(req);
    const bundle = req.body.context.bundle;
    res.send(resourcesToHookResponse(labelBundleDiff(bundle)));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  post
};
