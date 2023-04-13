const { validateSlsRequest } = require("../lib/validators");
const { label } = require("../lib/labeling/labeler");

async function post(req, res, next) {
  try {
    validateSlsRequest(req);
    res.send(label(req.body));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  post
};
