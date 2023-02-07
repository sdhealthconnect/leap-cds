const jwt = require("jsonwebtoken");
const superagent = require("superagent");

async function getGoogleAccessToken(clientEmail, privateKeyString) {
  const privateKey = Buffer.from(privateKeyString, "utf8");

  const now = Math.floor(Date.now() / 1000);
  const tokenRequest = jwt.sign(
    {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 60 * 5,
      iat: now
    },
    privateKey,
    { algorithm: "RS256" }
  );
  console.log(tokenRequest);

  const res = await superagent
    .post("https://oauth2.googleapis.com/token")
    .type("form")
    .send({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer" })
    .send({ assertion: tokenRequest });
  console.log(res.body);
  const accessToken = res.body.access_token;
  return accessToken;
}

module.exports = { getGoogleAccessToken };
