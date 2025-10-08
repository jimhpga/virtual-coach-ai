// api/whoami.js
module.exports = async (req, res) => {
  res.status(200).json({ ok: true, marker: "jim-whoami-917", time: Date.now() });
};
