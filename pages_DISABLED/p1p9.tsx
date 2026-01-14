import Head from "next/head";
import BrandShell from "../components/BrandShell";
import P1P9Accordion, { P1P9Item } from "../components/P1P9Accordion";

const ITEMS: P1P9Item[] = [
  { id:"P1", title:"Setup", status:"ON_TRACK",
    coachNotes:"Balanced, athletic posture with clean alignments.",
    commonMisses:["Ball too far back","Grip too weak/strong for pattern"],
    keyDrills:["Mirror setup check","Alignment stick for feet/hips/shoulders"]
  },
  { id:"P2", title:"Shaft parallel backswing", status:"ON_TRACK",
    coachNotes:"Clubhead tracks nicely along the target line with good face control.",
    commonMisses:["Club rolling inside early","Getting too steep by P2"],
    keyDrills:["Low-and-slow takeaway","Alignment rod on ground (hands/club path)"]
  },
  { id:"P3", title:"Lead arm parallel backswing", status:"ON_TRACK",
    coachNotes:"Good width and depth with plenty of rotation and coil potential.",
    commonMisses:["Lead arm collapses and loses width","Trail leg locks early"],
    keyDrills:["Wall drill (turn with space)","Towel-under-arms connection"]
  },
  { id:"P4", title:"Top of swing", status:"ON_TRACK",
    coachNotes:"Plenty of turn with a playable club position at the top.",
    commonMisses:["Across-the-line when rushed","Over-long backswing when tempo gets fast"],
    keyDrills:["3-to-1 tempo rehearsal","Pause-at-the-top swing"]
  },
  { id:"P5", title:"Lead arm parallel downswing", status:"NEEDS_ATTENTION",
    coachNotes:"Club is close to on-plane but can get just a touch steep under pressure.",
    commonMisses:["Upper body dives toward ball","Club drops too far outside hands"],
    keyDrills:["Pump drill (rehearse shallow)","Feet-together transition drill"]
  },
  { id:"P6", title:"Shaft parallel downswing", status:"NEEDS_ATTENTION",
    coachNotes:"Face and path are playable but a fraction steep can steal compression.",
    commonMisses:["Handle gets too high at P6","Trail shoulder drives down"],
    keyDrills:["Headcover just outside ball line","Split-hand rehearsal"]
  },
  { id:"P7", title:"Impact", status:"ON_TRACK",
    coachNotes:"Clubface is generally square with decent shaft lean and compression.",
    commonMisses:["Low-point drifts back","Hanging back adds loft"],
    keyDrills:["Divot-forward drill","Impact tape + strike pattern"]
  },
  { id:"P8", title:"Trail arm parallel follow-through", status:"ON_TRACK",
    coachNotes:"Arms and body are synced with a clean extension toward target.",
    commonMisses:["Club exits too low/left when held on","Arms outrace body"],
    keyDrills:["Hold P8 for 2 seconds","Throw-the-club (feel sequence)"]
  },
  { id:"P9", title:"Finish", status:"ON_TRACK",
    coachNotes:"Balanced, full finish with chest facing the target and weight left.",
    commonMisses:["Falling toward toes/heels","Stopping rotation early"],
    keyDrills:["Hold finish 3-count","Eyes-closed finish balance"]
  }
];

export default function P1P9TestPage() {
  return (
<BrandShell title="P1-P9 Checkpoints">
<>
      <Head><title>P1-P9 Accordion Test</title></Head>
      <main style={{
        minHeight:"100vh",
        padding:"26px 18px 60px",
        background:"radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%), #050b16",
        color:"#e6edf6"
      }}>
        <div style={{maxWidth:1200, margin:"0 auto"}}>
          <div style={{fontSize:28, fontWeight:1000, marginBottom:14}}>P1-P9 Accordion (Test)</div>
          <P1P9Accordion items={ITEMS} defaultMode="single" showExpandAll />
        </div>
      </main>
    </>
  
</BrandShell>
);
}
