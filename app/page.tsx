import TopNav from "./_components/TopNav";

export const dynamic = "force-static";

export default function HomePage(){
  return (
    <main className="vca-bg" style={{minHeight:"100vh",paddingBottom:72}}>
      <TopNav active="home" logoSrc="/brand/vca-logo.png" />
      <section style={{maxWidth:1120,margin:"0 auto",padding:"72px 18px 0",color:"#eef4f8"}}>
        <div style={{maxWidth:820}}>
          <div style={{color:"#65c7ff",fontSize:12,fontWeight:950,letterSpacing:1.8,textTransform:"uppercase"}}>AI golf coaching from one swing</div>
          <h1 style={{margin:"12px 0 14px",fontSize:"clamp(46px,7vw,84px)",lineHeight:.96,letterSpacing:-3}}>Stop guessing.<br/>Start improving.</h1>
          <p style={{maxWidth:700,margin:0,color:"rgba(232,240,248,.72)",fontSize:"clamp(17px,2vw,20px)",lineHeight:1.6}}>Upload a swing. Virtual Coach AI finds P1-P10, analyzes your motion, identifies the biggest opportunities, and gives you a clear coaching plan.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
            <a href="/upload" style={{padding:"14px 22px",borderRadius:14,background:"#65c7ff",color:"#06111a",fontWeight:950,textDecoration:"none",boxShadow:"0 14px 38px rgba(65,180,255,.22)"}}>Analyze My Swing</a>
            <a href="/demo" style={{padding:"14px 22px",borderRadius:14,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.06)",color:"#eef4f8",fontWeight:900,textDecoration:"none"}}>See Sample Analysis</a>
          </div>
        </div>

        <div style={{marginTop:38,padding:12,borderRadius:26,border:"1px solid rgba(255,255,255,.12)",background:"rgba(5,11,18,.78)",boxShadow:"0 38px 110px rgba(0,0,0,.42)"}}>
          <video src="/vca-golden-demo/analysis-preview.mp4" autoPlay muted loop playsInline preload="metadata" style={{width:"100%",display:"block",borderRadius:18,background:"#050b11"}}/>
        </div>

        <div className="vcaHomeGrid" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginTop:18}}>
          {[
            ["01","See it","P1-P10 checkpoints, hand path, body axes, and delivery."],
            ["02","Understand it","Know what is helping, what is leaking power, and why."],
            ["03","Fix it","Get the top priorities and a practice plan you can actually use."],
          ].map(([n,t,b])=><div key={n} style={{padding:20,borderRadius:20,border:"1px solid rgba(255,255,255,.10)",background:"rgba(0,0,0,.27)"}}><div style={{color:"#65c7ff",fontSize:11,fontWeight:950}}>{n}</div><div style={{marginTop:5,fontSize:22,fontWeight:950}}>{t}</div><div style={{marginTop:7,color:"rgba(232,240,248,.66)",fontSize:14,lineHeight:1.5}}>{b}</div></div>)}
        </div>

        <div style={{marginTop:54,padding:"28px 0",borderTop:"1px solid rgba(255,255,255,.09)",display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",flexWrap:"wrap"}}>
          <div><div style={{fontSize:26,fontWeight:950}}>One swing. A clear next step.</div><div style={{marginTop:4,color:"rgba(232,240,248,.62)"}}>Built for golfers who want answers, not more swing thoughts.</div></div>
          <a href="/upload" style={{padding:"13px 20px",borderRadius:14,background:"#65c7ff",color:"#06111a",fontWeight:950,textDecoration:"none"}}>Upload a Swing</a>
        </div>
      </section>
      <style>{`@media(max-width:760px){.vcaHomeGrid{grid-template-columns:1fr!important}}`}</style>
    </main>
  );
}