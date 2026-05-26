const { handleApi, send } = require("../server/timeloop-api");

module.exports = async function handler(req, res) {
  try {
    const host = req.headers.host || "localhost:3000";
    const url = new URL(req.url, `https://${host}`);
    const pathname = url.pathname.startsWith("/api/") ? url.pathname : `/api${url.pathname}`;
    return await handleApi(req, res, pathname);
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
