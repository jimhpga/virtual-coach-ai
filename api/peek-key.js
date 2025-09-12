module.exports = (req,res)=>{
  const exp = String(process.env.REPORT_API_KEY ?? "").trim();
  res.status(200).json({ ok:true, expected:{ length: exp.length, head: exp.slice(0,4), tail: exp.slice(-4) } });
};
