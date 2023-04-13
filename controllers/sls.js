const { validateSlsRequest } = require("../lib/validators");
const { labelBundle } = require("../lib/labeling/labeler");

async function post(req, res, next) {
  try {
    validateSlsRequest(req);
    res.send(labelBundle(req.body));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  post
};
