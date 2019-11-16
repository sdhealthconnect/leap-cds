function ping(req, res) {
  const requestedError = req.query.error;
  if (requestedError === "bad_request") {
    throw {
      httpCode: 400,
      error: "bad_request",
      errorMessage: "Invalid request."
    };
  } else if (requestedError === "internal_error") {
    throw {
      httpCode: 500,
      error: "internal_error",
      errorMessage: "Internal server error."
    };
  }
  res.send("");
}

module.exports = {
  ping
};
