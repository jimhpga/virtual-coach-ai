$ErrorActionPreference = "Stop"

$fp = "C:\Sites\virtual-coach-ai\app\report-beta\full\FullClient.tsx"
if (!(Test-Path $fp)) { throw "File not found: $fp" }

$bak = "$fp.bak_fix_p1p9_tiles_{0}.tsx" -f (Get-Date -Format yyyyMMdd_HHmmss)
Copy-Item $fp $bak -Force

$lines = Get-Content -Path $fp

# -------- find PRACTICE PLAN render marker (end anchor) --------
$planHit = Select-String -Path $fp -Pattern "{/* PRACTICE PLAN */}" -SimpleMatch | Select-Object -First 1
if (-not $planHit) { throw "Could not find '{/* PRACTICE PLAN */}' marker." }
$planIdx = $planHit.LineNumber - 1  # 0-based index for $lines

# -------- find the start of the broken P1–P9 block (begin anchor) --------
# We anchor on the legend pills line and walk up to the nearest <Panel
$legendHit = Select-String -Path $fp -Pattern '{pill("ontrack")}' -SimpleMatch | Select-Object -First 1
if (-not $legendHit) { throw "Could not find legend pills '{pill(""ontrack"")}' anchor." }
$legendIdx = $legendHit.LineNumber - 1

$startIdx = -1
for ($i = $legendIdx; $i -ge 0; $i--) {
  if ($lines[$i] -match '^\s*<Panel\b') { $startIdx = $i; break }
}
if ($startIdx -lt 0) { throw "Could not locate the <Panel ...> start above legend." }

if ($startIdx -ge $planIdx) { throw "Bad anchors: startIdx >= planIdx (something is off)." }

# -------- replacement block: Clean P1–P9 tiles, collapsed by default --------
$block = @(
'      {/* P1–P9 CHECKPOINTS (tiles, collapsible) */}',
'      <Panel',
'        title="P1-P9 Checkpoints"',
'        right={',
'          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, opacity: 0.85, flexWrap: "wrap" }}>',
'            <span style={{ opacity: 0.7 }}>Legend:</span>',
'            {pill("ontrack")} {pill("needs")} {pill("priority")}',
'          </div>',
'        }',
'      >',
'        <div style={{ display:"flex", gap:8, margin:"2px 0 12px", flexWrap:"wrap" }}>',
'          <button',
'            type="button"',
'            onClick={() => { setExpandAllP(true); setOpenP(null); }}',
'            style={{ height:32, padding:"0 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", color:"#e6edf6", fontWeight:900, cursor:"pointer", opacity: expandAllP ? 0.7 : 1 }}',
'          >',
'            Expand all',
'          </button>',
'          <button',
'            type="button"',
'            onClick={() => { setExpandAllP(false); setOpenP(7); }}',
'            style={{ height:32, padding:"0 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", color:"#e6edf6", fontWeight:900, cursor:"pointer", opacity: !expandAllP ? 0.85 : 1 }}',
'          >',
'            Collapse all',
'          </button>',
'          <span style={{ fontSize:12, opacity:0.72, alignSelf:"center" }}>Default open: P7 (impact)</span>',
'        </div>',
'',
'        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap: 12 }}>',
'          {data.pchecks.map((c) => {',
'            const isOpen = expandAllP || openP === c.p;',
'            return (',
'              <div key={c.p} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.14)", overflow:"hidden" }}>',
'                <button',
'                  type="button"',
'                  onClick={() => { if (!expandAllP) setOpenP((cur) => (cur === c.p ? null : c.p)); }}',
'                  style={{',
'                    width:"100%",',
'                    textAlign:"left",',
'                    padding:"10px 12px",',
'                    display:"flex",',
'                    justifyContent:"space-between",',
'                    alignItems:"center",',
'                    gap:10,',
'                    cursor: expandAllP ? "default" : "pointer",',
'                    background:"transparent",',
'                    border:"none",',
'                    color:"#eaf1ff"',
'                  }}',
'                  title={expandAllP ? "Expanded" : "Tap to expand / collapse"}',
'                >',
'                  <div style={{ display:"flex", gap:10, alignItems:"baseline" }}>',
'                    <div style={{ fontWeight: 950 }}>P{c.p}</div>',
'                    <div style={{ fontSize: 13, opacity: 0.92, fontWeight: 850 }}>{c.title}</div>',
'                  </div>',
'                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>',
'                    {pill((c as any).status ?? (c.p === 7 ? "priority" : "needs"))}',
'                    <span style={{ fontSize: 12, opacity: 0.75 }}>{isOpen ? "−" : "+"}</span>',
'                  </div>',
'                </button>',
'',
'                {isOpen && (',
'                  <div style={{ padding:"0 12px 12px" }}>',
'                    <div style={{ display:"grid", gap:10 }}>',
'                      <SoftCard>',
'                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Coach Notes</div>',
'                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>',
'                          {c.coachNotes.map((x, i) => <li key={i}>{x}</li>)}',
'                        </ul>',
'                      </SoftCard>',
'',
'                      <SoftCard>',
'                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Common Misses</div>',
'                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>',
'                          {c.commonMisses.map((x, i) => <li key={i}>{x}</li>)}',
'                        </ul>',
'                      </SoftCard>',
'',
'                      <SoftCard>',
'                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Key Drills</div>',
'                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>',
'                          {c.drills.map((x, i) => <li key={i}>{x}</li>)}',
'                        </ul>',
'                      </SoftCard>',
'                    </div>',
'                  </div>',
'                )}',
'              </div>',
'            );',
'          })}',
'        </div>',
'      </Panel>',
''
)

# -------- apply replacement (remove old broken block, insert new one) --------
$new = New-Object System.Collections.Generic.List[string]

for ($i=0; $i -lt $lines.Count; $i++) {
  if ($i -eq $startIdx) {
    foreach ($x in $block) { $new.Add($x) | Out-Null }
    # skip everything until just before practice plan marker
    $i = $planIdx - 1
    continue
  }
  $new.Add($lines[$i]) | Out-Null
}

Set-Content -Path $fp -Value $new.ToArray() -Encoding UTF8

Write-Host "OK: Rebuilt P1-P9 into clean collapsible tiles and removed the broken orphan </details> block." -ForegroundColor Green
Write-Host ("Backup: {0}" -f $bak) -ForegroundColor DarkGray

Write-Host "`nVERIFY anchors:" -ForegroundColor DarkGray
Select-String -Path $fp -Pattern "P1-P9 Checkpoints","data.pchecks.map","{/* PRACTICE PLAN */}" -SimpleMatch -Context 0,1
