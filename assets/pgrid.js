// P1–P9 data. Replace youtube links with your existing ones.
const CHECKPOINTS = [
  {
    pos: "P1", label: "Setup (Grip/Posture)",
    status: "yellow", // red | yellow | green
    short: "Neutral grip, hip hinge ~25°, pressure 55/45 (lead/trail).",
    long: "Key checks: ball position by club, chin up for airway, soft knees, lead wrist neutral, spine-angle match ready for P2.",
    youtube: "https://www.youtube.com/watch?v=XXXXXXXXX"
  },
  {
    pos: "P2", label: "Shaft Parallel — Backswing",
    status: "green",
    short: "Face matches spine-angle; club outside hands; one-piece takeaway.",
    long: "Cue: chest moves the club, trail wrist starts to set; avoid early roll-in or whip inside.",
    youtube: "https://www.youtube.com/watch?v=YYYYYYYYY"
  },
  {
    pos: "P3", label: "Lead Arm Parallel — Backswing",
    status: "yellow",
    short: "Lead wrist flat; shaft slightly inside; trail elbow in front of seam.",
    long: "Maintain width; avoid over-rotation of forearms; pressure continues to trail foot midfoot/heel.",
    youtube: "https://www.youtube.com/watch?v=ZZZZZZZZZ"
  },
  {
    pos: "P4", label: "Top of Swing",
    status: "red",
    short: "Complete turn; trail elbow ~90°; club not across the line.",
    long: "Feel: ribcage finishes turn before hands lift; avoid collapse of lead arm; stable trail knee flex.",
    youtube: "https://www.youtube.com/watch?v=A1A1A1A1A"
  },
  {
    pos: "P5", label: "Lead Arm Parallel — Downswing",
    status: "green",
    short: "Belt buckle leads; shallow ~5–10°; hands in front of seam.",
    long: "Sequence: pelvis, torso, arms, club. Maintain side-bend; pressure shifts forward quickly.",
    youtube: "https://www.youtube.com/watch?v=B2B2B2B2B"
  },
  {
    pos: "P6", label: "Shaft Parallel — Delivery",
    status: "yellow",
    short: "Shaft under trail forearm; handle forward; face not hanging open.",
    long: "Cue: rotate through while keeping trail wrist extended; avoid stall/flip.",
    youtube: "https://www.youtube.com/watch?v=C3C3C3C3C"
  },
  {
    pos: "P7", label: "Impact",
    status: "green",
    short: "Forward shaft lean; ~80–90% lead side; chest slightly open.",
    long: "Lead leg bracing, handle ahead, low point ahead of ball; quiet head, loud hips.",
    youtube: "https://www.youtube.com/watch?v=D4D4D4D4D"
  },
  {
    pos: "P8", label: "Trail Arm Parallel — Follow-Through",
    status: "yellow",
    short: "Arms extend; chest left of target; face square to arc.",
    long: "No chicken-wing; keep rotation going; balanced through the strike.",
    youtube: "https://www.youtube.com/watch?v=E5E5E5E5E"
  },
  {
    pos: "P9", label: "Finish",
    status: "green",
    short: "Tall, balanced; belt buckle at target; full wrap.",
    long: "Pressure fully into lead heel; can hold pose; no back-foot spin-out.",
    youtube: "https://www.youtube.com/watch?v=F6F6F6F6F"
  }
];

const STATUS_CLASS = {
  red:   "border-red pill pill-red",
  yellow:"border-yellow pill pill-yellow",
  green: "border-green pill pill-green",
};

function createCard(cp){
  const card = document.createElement('article');
  card.className = `p-card glass ${STATUS_CLASS[cp.status].split(' ')[0]}`;

  card.innerHTML = `
    <div class="head">
      <div class="pos">${cp.pos}</div>
      <div class="label">${cp.label}</div>
      <div class="status"><span class="${STATUS_CLASS[cp.status].split(' ').slice(1).join(' ')}">${cp.status.toUpperCase()}</span></div>
    </div>
    <div class="body">
      <div>
        <div class="short">${cp.short}</div>
        <div class="long" id="long-${cp.pos}">${cp.long}</div>
      </div>
      <div class="actions">
        <button class="btn toggle" data-pos="${cp.pos}">More</button>
        <button class="btn video" data-url="${cp.youtube}">YouTube</button>
      </div>
    </div>
    <div class="badge-rail">
      <span class="badge ${cp.status}">${cp.pos}</span>
    </div>
  `;
  return card;
}

function mountGrid(){
  const grid = document.getElementById('pgrid');
  CHECKPOINTS.forEach(cp => grid.appendChild(createCard(cp)));

  grid.addEventListener('click', (e)=>{
    const t = e.target;
    if (t.matches('.toggle')){
      const pos = t.getAttribute('data-pos');
      const long = document.getElementById(`long-${pos}`);
      const open = long.style.display === 'block';
      long.style.display = open ? 'none' : 'block';
      t.textContent = open ? 'More' : 'Less';
    }
    if (t.matches('.video')){
      const url = t.getAttribute('data-url');
      openYouTube(url);
    }
  });
}

// YouTube modal handlers
const dlg = document.getElementById('ytModal');
const frame = document.getElementById('ytFrame');
const closeBtn = document.getElementById('ytClose');

function openYouTube(url){
  const embed = toEmbed(url);
  frame.src = embed;
  dlg.showModal();
}
function toEmbed(url){
  // supports youtu.be/ID and youtube.com/watch?v=ID
  try{
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')){
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0`;
    }
    if (u.hostname.includes('youtube.com')){
      const id = u.searchParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
  }catch{}
  return url; // fallback
}

closeBtn?.addEventListener('click', ()=> { frame.src=''; dlg.close(); });
dlg?.addEventListener('close', ()=> { frame.src=''; });

document.addEventListener('DOMContentLoaded', mountGrid);
