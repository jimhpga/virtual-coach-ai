import TopNav from "../_components/TopNav";

export default function DemoPage(){
  return (
    <main className="vca-bg" style={{minHeight:"100vh",paddingBottom:64}}>
      <TopNav active="home" logoSrc="/brand/vca-logo.png" />
      <section style={{maxWidth:1120,margin:"42px auto 0",padding:"0 18px",color:"#eef4f8"}}>
        <div style={{textAlign:"center",maxWidth:760,margin:"0 auto 26px"}}>
          <div style={{color:"#65c7ff",fontSize:12,fontWeight:950,letterSpacing:1.7,textTransform:"uppercase"}}>Sample Instant Lesson</div>
          <h1 style={{margin:"10px 0 8px",fontSize:"clamp(36px,5vw,58px)",lineHeight:1.02,letterSpacing:-1.8}}>See the swing. Know what to fix.</h1>
          <p style={{margin:0,color:"rgba(232,240,248,.72)",fontSize:17,lineHeight:1.6}}>One swing becomes a visual sequence, motion analysis, priority fixes, power opportunities, and a practice plan.</p>
        </div>
        <div style={{padding:12,borderRadius:24,border:"1px solid rgba(255,255,255,.12)",background:"rgba(6,12,20,.78)",boxShadow:"0 30px 90px rgba(0,0,0,.4)"}}>
          <video src="/vca-golden-demo/analysis-preview.mp4" autoPlay muted loop playsInline controls style={{width:"100%",display:"block",borderRadius:16,background:"#050b11"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginTop:16}} className="vcaDemoCards">
          {[
            ["What you do well","Athletic motion","Build on the parts of your swing that are already helping you."],
            ["Where power leaks","Transition timing","See where sequence and delivery are costing speed or consistency."],
            ["What to do next","Three priorities","Leave with a short plan instead of twenty swing thoughts."],
          ].map(([k,t,b])=><div key={k} style={{padding:20,borderRadius:20,border:"1px solid rgba(255,255,255,.10)",background:"rgba(0,0,0,.30)"}}><div style={{color:"#65c7ff",fontSize:11,fontWeight:950,textTransform:"uppercase",letterSpacing:1.1}}>{k}</div><div style={{marginTop:7,fontSize:22,fontWeight:950}}>{t}</div><div style={{marginTop:7,color:"rgba(232,240,248,.68)",fontSize:14,lineHeight:1.5}}>{b}</div></div>)}
        </div>
        <div style={{marginTop:16,padding:10,borderRadius:22,border:"1px solid rgba(255,255,255,.10)",background:"rgba(0,0,0,.30)"}}>
          <img src="/vca-golden-demo/analysis-board.png" alt="Virtual Coach AI swing sequence analysis" style={{width:"100%",display:"block",borderRadius:14}}/>
        </div>
        <div style={{textAlign:"center",marginTop:28}}><a href="/upload" style={{display:"inline-block",padding:"14px 22px",borderRadius:14,background:"#65c7ff",color:"#06111a",fontWeight:950,textDecoration:"none"}}>Analyze My Swing</a></div>
      </section>
      <style>{`@media(max-width:760px){.vcaDemoCards{grid-template-columns:1fr!important}}`}</style>
    </main>
  );
}