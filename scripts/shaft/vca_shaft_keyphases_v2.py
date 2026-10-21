import argparse, datetime, glob, json, os, subprocess, sys
import cv2
import mediapipe as mp

PHASES=["P2","P3","P5","P6","P7"]

def load_json(path):
    with open(path,"r",encoding="utf-8-sig") as f:
        return json.load(f)

def phase_map(shot):
    candidates=[
        os.path.join(shot,"phase_frames_override.flat.json"),
        os.path.join(shot,"phase_frames_override.json"),
    ]
    for p in candidates:
        if not os.path.isfile(p):
            continue
        j=load_json(p)
        if isinstance(j,dict) and all(k in j for k in PHASES):
            return {k:int(j[k]) for k in PHASES}
        if isinstance(j,dict) and isinstance(j.get("phases"),list):
            m={}
            for x in j["phases"]:
                if isinstance(x,dict) and x.get("phase") in PHASES and x.get("frame") is not None:
                    m[x["phase"]]=int(x["frame"])
            if all(k in m for k in PHASES):
                return m
    raise RuntimeError("No usable P2/P3/P5/P6/P7 phase frame map found")

def video_pose_score(path, frames):
    cap=cv2.VideoCapture(path)
    if not cap.isOpened():
        return -1.0, {"reason":"cannot_open"}
    count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if count <= max(frames.values()):
        cap.release()
        return -1.0, {"reason":"too_short","frameCount":count}

    pose=mp.solutions.pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.45
    )

    detected=0
    quality=0.0
    details=[]
    try:
        for phase in PHASES:
            frame=frames[phase]
            cap.set(cv2.CAP_PROP_POS_FRAMES,frame)
            ok,img=cap.read()
            if not ok:
                details.append({"phase":phase,"detected":False})
                continue
            res=pose.process(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
            if not res.pose_landmarks:
                details.append({"phase":phase,"detected":False})
                continue
            lm=res.pose_landmarks.landmark
            # Shoulders/hips prove a golfer-like body is present; wrists matter for shaft work.
            ids=[11,12,15,16,23,24]
            vis=[max(0.0,min(1.0,float(lm[i].visibility))) for i in ids]
            q=sum(vis)/len(vis)
            detected+=1
            quality+=q
            details.append({"phase":phase,"detected":True,"quality":round(q,3)})
    finally:
        pose.close()
        cap.release()

    # Detection count dominates. Mean landmark visibility breaks ties.
    score=(detected/len(PHASES))*0.72 + ((quality/max(1,detected))*0.28 if detected else 0.0)
    return score, {"detected":detected,"quality":round(quality/max(1,detected),3),"frames":details}

def choose_video(shot, frames):
    preferred=["cropped_SAFEWIDE.mp4","cropped_WIDE.mp4","cropped_big.mp4","cropped.mp4"]
    candidates=[]
    for name in preferred:
        p=os.path.join(shot,name)
        if os.path.isfile(p):
            candidates.append(p)

    for p in glob.glob(os.path.join(shot,"*.mp4")):
        low=os.path.basename(p).lower()
        if "window_" in low or "withaudio" in low or "dbg_" in low:
            continue
        if p not in candidates:
            candidates.append(p)

    if not candidates:
        raise RuntimeError("No source video found in shot directory")

    ranked=[]
    for p in candidates:
        score,detail=video_pose_score(p,frames)
        ranked.append((score,p,detail))
    ranked.sort(key=lambda x:(x[0], os.path.getsize(x[1]) if os.path.isfile(x[1]) else 0),reverse=True)

    best_score,best_path,best_detail=ranked[0]
    if best_score < 0.42 or int(best_detail.get("detected",0)) < 2:
        audit=[{"video":p,"score":round(s,3),"detail":d} for s,p,d in ranked]
        raise RuntimeError("No candidate video contains reliable golfer pose at requested phases: "+json.dumps(audit))

    print(json.dumps({
        "videoSelection":"pose_validated",
        "selected":best_path,
        "score":round(best_score,3),
        "detail":best_detail,
        "candidates":[{"video":p,"score":round(s,3),"detected":d.get("detected")} for s,p,d in ranked]
    }))
    return best_path

def run(cmd):
    cp=subprocess.run(cmd,capture_output=True,text=True)
    if cp.returncode!=0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{cp.stdout}\n{cp.stderr}")
    return cp

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--shotDir",required=True)
    ap.add_argument("--out",default="")
    ap.add_argument("--video",default="")
    ap.add_argument("--debug",action="store_true")
    args=ap.parse_args()

    shot=os.path.abspath(args.shotDir)
    scripts=os.path.dirname(os.path.abspath(__file__))
    anchor_script=os.path.join(scripts,"vca_grip_anchor.py")
    shaft_script=os.path.join(scripts,"vca_shaftline_detect_v2.py")
    for p in [anchor_script,shaft_script]:
        if not os.path.isfile(p):
            raise RuntimeError(f"Missing dependency: {p}")

    frames=phase_map(shot)
    video=os.path.abspath(args.video) if args.video else choose_video(shot,frames)
    if not os.path.isfile(video):
        raise RuntimeError(f"Video not found: {video}")

    work=os.path.join(shot,"_shaft_v2")
    os.makedirs(work,exist_ok=True)

    cap=cv2.VideoCapture(video)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video}")
    fps=float(cap.get(cv2.CAP_PROP_FPS) or 0)
    n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    output=[]
    measured=0
    for phase in PHASES:
        frame=frames[phase]
        cap.set(cv2.CAP_PROP_POS_FRAMES,frame)
        ok,img=cap.read()
        if not ok:
            output.append({
                "date":datetime.date.today().isoformat(),
                "phase":phase,"frame":frame,
                "shaft":{"angleDeg":None,"confidenceRaw":0,"source":"unavailable",
                         "why":"Could not extract phase frame.","vision":None},
                "delta":{"deg":None,"note":"shaft unavailable"}
            })
            continue

        img_path=os.path.join(work,f"{phase}_F{frame}.png")
        grip_path=os.path.join(work,f"{phase}_grip_v1.json")
        shaft_path=os.path.join(work,f"{phase}_shaft_v2.json")
        debug_path=os.path.join(work,f"{phase}_shaft_v2_debug.png")
        cv2.imwrite(img_path,img)

        run([sys.executable,anchor_script,"--img",img_path,"--out",grip_path])
        cmd=[sys.executable,shaft_script,"--img",img_path,"--grip",grip_path,"--out",shaft_path]
        if args.debug:
            cmd += ["--debugImg",debug_path]
        run(cmd)

        g=load_json(grip_path)
        s=load_json(shaft_path)
        sok=bool(s.get("ok")) and int((s.get("shaft") or {}).get("confidence") or 0)>0
        if sok:
            measured+=1
        reason=(s.get("debug") or {}).get("reason")
        if not reason:
            reason="Measured from vision with grip-anchored Shaft V2." if sok else "Shaft not reliable enough to measure."

        output.append({
            "date":datetime.date.today().isoformat(),
            "phase":phase,
            "frame":frame,
            "handPlaneDeg":None,
            "shaft":{
                "angleDeg":(s.get("shaft") or {}).get("angleDeg"),
                "confidenceRaw":int((s.get("shaft") or {}).get("confidence") or 0),
                "source":"vision_grip_anchor_v2" if sok else "unavailable",
                "why":reason,
                "anchor":{
                    "status":(s.get("anchor") or {}).get("status",g.get("status")),
                    "confidence":(s.get("anchor") or {}).get("confidence",
                                   (float(g.get("confidence",0))/100.0 if g.get("confidence") is not None else 0)),
                    "strategy":g.get("strategy")
                },
                "vision":{
                    "angleDeg":(s.get("shaft") or {}).get("angleDeg"),
                    "confidence":int((s.get("shaft") or {}).get("confidence") or 0),
                    "source":"vision_grip_anchor_v2",
                    "line":(s.get("shaft") or {}).get("line")
                }
            },
            "delta":{"deg":None,"note":"delta requires arm-plane consumer"}
        })

    cap.release()

    payload={
        "schemaVersion":"2.0",
        "detector":"grip_anchor_v1+shaft_v2",
        "video":video,
        "fps":fps,
        "frameCount":n,
        "measuredPhases":measured,
        "requestedPhases":len(PHASES),
        "status":"ok" if measured>=3 else ("partial" if measured>0 else "unavailable"),
        "phases":output
    }

    # Keep legacy array format as the primary file for existing consumers.
    out_path=args.out or os.path.join(shot,f"VCA_shaft_FINAL_V2_P2_P3_P5_P6_P7_{datetime.date.today().isoformat()}.json")
    os.makedirs(os.path.dirname(out_path) or ".",exist_ok=True)
    with open(out_path,"w",encoding="utf-8") as f:
        json.dump(output,f,indent=2)
    meta_path=os.path.splitext(out_path)[0]+".meta.json"
    with open(meta_path,"w",encoding="utf-8") as f:
        json.dump(payload,f,indent=2)

    print(json.dumps({
        "ok":True,
        "out":out_path,
        "meta":meta_path,
        "status":payload["status"],
        "measuredPhases":measured,
        "requestedPhases":len(PHASES),
        "video":video
    },indent=2))

if __name__=="__main__":
    main()
