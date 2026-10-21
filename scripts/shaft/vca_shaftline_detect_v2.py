import json, math, os, argparse
import cv2
import numpy as np

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def norm180(a):
    while a > 180: a -= 360
    while a <= -180: a += 360
    return a

def undirected_angle(a):
    a = norm180(a)
    if a > 90: a -= 180
    if a <= -90: a += 180
    return a

def angle_diff_undirected(a, b):
    if a is None or b is None: return 90.0
    return abs(undirected_angle(a) - undirected_angle(b))

def line_angle(x1,y1,x2,y2):
    return math.degrees(math.atan2(y2-y1, x2-x1))

def point_line_distance(px, py, x1, y1, x2, y2):
    vx, vy = x2-x1, y2-y1
    den = math.hypot(vx,vy)
    if den < 1e-6: return 1e9
    return abs(vy*(px-x1)-vx*(py-y1))/den

def endpoint_dists(px,py,x1,y1,x2,y2):
    return math.hypot(px-x1,py-y1), math.hypot(px-x2,py-y2)

def sample_contrast(gray, x1,y1,x2,y2):
    # Shaft-like lines typically carry sustained local edge energy.
    mask=np.zeros(gray.shape[:2],np.uint8)
    cv2.line(mask,(int(x1),int(y1)),(int(x2),int(y2)),255,3,cv2.LINE_AA)
    edge=cv2.Canny(gray,40,120)
    vals=edge[mask>0]
    if vals.size==0: return 0.0
    return float(np.mean(vals>0))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--img",required=True)
    ap.add_argument("--grip",required=True)
    ap.add_argument("--out",required=True)
    ap.add_argument("--proxyAngle",default=None)
    ap.add_argument("--debugImg",default=None)
    args=ap.parse_args()

    img=cv2.imread(args.img)
    if img is None: raise RuntimeError(f"Failed to read {args.img}")
    h,w=img.shape[:2]
    diag=math.hypot(w,h)

    grip=load_json(args.grip)
    gx,gy=grip.get("x"),grip.get("y")
    if gx is None or gy is None:
        out={
            "ok":False,
            "img":args.img,
            "grip_px":{"x":None,"y":None},
            "anchor":{
                "confidence":round(float(grip.get("confidence",0))/100.0,3) if grip.get("confidence") is not None else 0,
                "status":str(grip.get("status") or "missing")
            },
            "shaft":{"angleDeg":None,"confidence":0,"source":"vision_grip_anchor_v2","line":None},
            "debug":{"reason":str(grip.get("reason") or "missing_grip_anchor")}
        }
        os.makedirs(os.path.dirname(args.out) or ".",exist_ok=True)
        with open(args.out,"w",encoding="utf-8") as f: json.dump(out,f,indent=2)
        return
    gx=float(gx); gy=float(gy)

    anchor_conf_raw=grip.get("confidence", None)
    try:
        anchor_conf=float(anchor_conf_raw)/100.0 if anchor_conf_raw is not None else None
    except:
        anchor_conf=None

    # Backward compatibility for benchmark/legacy grip files that carry wrist visibility.
    if anchor_conf is None:
        try:
            lv=float((grip.get("left") or {}).get("v"))
            rv=float((grip.get("right") or {}).get("v"))
            anchor_conf=0.65*max(lv,rv)+0.35*min(lv,rv)
        except:
            try:
                anchor_conf=float(grip.get("visibility"))
            except:
                anchor_conf=1.0

    anchor_conf=clamp(anchor_conf if anchor_conf is not None else 1.0,0.0,1.0)
    anchor_status=str(grip.get("status") or ("strong" if anchor_conf>=0.55 else ("usable" if anchor_conf>=0.30 else "low_confidence")))

    if 0<=gx<=1 and 0<=gy<=1:
        gx*=w; gy*=h

    # Grossly invalid legacy anchors must never silently become top-left pixel coordinates.
    if gx < 0 or gy < 0 or gx >= w or gy >= h:
        out={
            "ok":False,
            "img":args.img,
            "grip_px":{"x":gx,"y":gy},
            "anchor":{"confidence":round(anchor_conf,3),"status":anchor_status},
            "shaft":{"angleDeg":None,"confidence":0,"source":"vision_grip_anchor_v2","line":None},
            "debug":{"reason":"invalid_grip_anchor"}
        }
        os.makedirs(os.path.dirname(args.out) or ".",exist_ok=True)
        with open(args.out,"w",encoding="utf-8") as f: json.dump(out,f,indent=2)
        return

    proxy=None
    try:
        if args.proxyAngle is not None: proxy=float(args.proxyAngle)
    except: proxy=None

    # Large enough to contain most of the shaft, but still centered on the hands.
    radius=int(round(0.34*min(w,h)))
    x0=max(0,int(gx-radius)); x1=min(w,int(gx+radius))
    y0=max(0,int(gy-radius)); y1=min(h,int(gy+radius))
    roi=img[y0:y1,x0:x1]
    gray=cv2.cvtColor(roi,cv2.COLOR_BGR2GRAY)
    gray=cv2.GaussianBlur(gray,(3,3),0)

    candidates=[]

    # Multi-threshold Hough catches long faint shafts.
    for lo,hi,thr,minfrac,gap in [
        (25,80,24,0.12,20),
        (40,120,30,0.14,18),
        (60,180,36,0.16,15),
    ]:
        edges=cv2.Canny(gray,lo,hi)
        lines=cv2.HoughLinesP(edges,1,np.pi/360,threshold=thr,
                              minLineLength=max(28,int(minfrac*max(roi.shape[:2]))),
                              maxLineGap=gap)
        if lines is not None:
            for l in lines[:,0,:]:
                candidates.append(("hough",*(float(v) for v in l)))

    # LSD is excellent for thin club shafts when Hough fragments them.
    lsd=cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD)
    lsd_lines=lsd.detect(gray)[0]
    if lsd_lines is not None:
        for l in lsd_lines[:,0,:]:
            candidates.append(("lsd",*(float(v) for v in l)))

    # Deduplicate quantized segments.
    unique=[]
    seen=set()
    for src,xa,ya,xb,yb in candidates:
        key=(round(min(xa,xb)/4),round(min(ya,yb)/4),round(max(xa,xb)/4),round(max(ya,yb)/4),round(undirected_angle(line_angle(xa,ya,xb,yb))/3))
        if key in seen: continue
        seen.add(key); unique.append((src,xa,ya,xb,yb))

    gcx,gcy=gx-x0,gy-y0
    anchor_line_max=max(16.0,0.018*diag)
    anchor_end_soft=max(45.0,0.052*diag)
    min_len=max(35.0,0.045*diag)

    scored=[]
    for src,xa,ya,xb,yb in unique:
        length=math.hypot(xb-xa,yb-ya)
        if length<min_len: continue
        dline=point_line_distance(gcx,gcy,xa,ya,xb,yb)
        da,db=endpoint_dists(gcx,gcy,xa,ya,xb,yb)
        near=min(da,db); far=max(da,db)

        # Hard physical gate: line must pass near grip OR have an endpoint reasonably near it.
        if dline>anchor_line_max and near>anchor_end_soft:
            continue

        # Reject tiny local body/clothing edges that do not extend away from hands.
        if far < max(75.0,0.08*diag):
            continue

        ang=undirected_angle(line_angle(xa,ya,xb,yb))
        anchor_line=1.0-clamp(dline/anchor_line_max,0,1)
        anchor_end=1.0-clamp(near/anchor_end_soft,0,1)
        anchor=max(anchor_line,0.78*anchor_end)
        len_score=clamp(length/(0.30*diag),0,1)
        extension=clamp((far-near)/(0.26*diag),0,1)
        contrast=clamp(sample_contrast(gray,xa,ya,xb,yb)*3.0,0,1)
        if proxy is None:
            proxy_score=0.5
        else:
            proxy_score=1.0-clamp(angle_diff_undirected(ang,proxy)/38.0,0,1)

        # Grip attachment dominates. Proxy is deliberately weak.
        score=(0.46*anchor)+(0.22*len_score)+(0.16*extension)+(0.11*contrast)+(0.05*proxy_score)

        # Extra penalty for lines whose closest endpoint is far despite crossing grip only by extrapolation.
        if near>anchor_end_soft*1.8:
            score*=0.72

        scored.append({
            "src":src,"xa":xa,"ya":ya,"xb":xb,"yb":yb,"angle":ang,
            "length":length,"dline":dline,"near":near,"far":far,
            "anchor":anchor,"lenScore":len_score,"extension":extension,
            "contrast":contrast,"proxyScore":proxy_score,"score":score
        })

    scored.sort(key=lambda z:z["score"],reverse=True)
    best=scored[0] if scored else None

    out={
        "ok":bool(best) and anchor_conf>=0.20,
        "img":args.img,
        "grip_px":{"x":round(gx,2),"y":round(gy,2)},
        "anchor":{"confidence":round(anchor_conf,3),"status":anchor_status},
        "roi_px":{"x0":x0,"y0":y0,"x1":x1,"y1":y1},
        "proxyAngleDeg":proxy,
        "shaft":{"angleDeg":None,"confidence":0,"source":"vision_grip_anchor_v2","line":None},
        "debug":{"candidateCount":len(unique),"anchoredCandidateCount":len(scored),"top":[]}
    }

    dbg=img.copy()
    cv2.circle(dbg,(int(round(gx)),int(round(gy))),12,(0,255,255),-1,cv2.LINE_AA)

    for rank,c in enumerate(scored[:8]):
        X1=int(round(c["xa"]+x0));Y1=int(round(c["ya"]+y0))
        X2=int(round(c["xb"]+x0));Y2=int(round(c["yb"]+y0))
        color=(80,180,80) if rank else (0,0,255)
        cv2.line(dbg,(X1,Y1),(X2,Y2),color,2 if rank else 6,cv2.LINE_AA)
        out["debug"]["top"].append({
            "rank":rank+1,"source":c["src"],"score":round(c["score"],4),
            "angleDeg":round(c["angle"],3),"length":round(c["length"],1),
            "distLineGrip":round(c["dline"],1),"distEndpointGrip":round(c["near"],1),
            "anchor":round(c["anchor"],3),"contrast":round(c["contrast"],3)
        })

    if best:
        # Orient from endpoint closer to grip toward farther endpoint.
        da,db=endpoint_dists(gcx,gcy,best["xa"],best["ya"],best["xb"],best["yb"])
        if da<=db:
            nearpt=(best["xa"]+x0,best["ya"]+y0); farpt=(best["xb"]+x0,best["yb"]+y0)
        else:
            nearpt=(best["xb"]+x0,best["yb"]+y0); farpt=(best["xa"]+x0,best["ya"]+y0)

        # For display/measurement anchor the shaft at the grip, preserving detected direction.
        vx,vy=farpt[0]-nearpt[0],farpt[1]-nearpt[1]
        n=math.hypot(vx,vy)+1e-9
        ux,uy=vx/n,vy/n
        length=max(best["length"],best["far"])
        endx=gx+ux*length; endy=gy+uy*length
        angle=undirected_angle(math.degrees(math.atan2(endy-gy,endx-gx)))

        confidence=int(round(100*clamp((best["score"]-0.28)/0.62,0,1)))
        # Confidence ceiling if segment itself is not close to grip.
        if best["near"]>anchor_end_soft:
            confidence=min(confidence,69)

        # Shaft confidence can never outrun the hand-anchor confidence.
        if anchor_conf < 0.20:
            confidence=0
            out["ok"]=False
            out["debug"]["reason"]="weak_grip_anchor"
        elif anchor_conf < 0.30:
            confidence=min(confidence,40)
        elif anchor_conf < 0.55:
            confidence=min(confidence,72)

        if confidence > 0:
            out["shaft"]["angleDeg"]=angle
            out["shaft"]["confidence"]=confidence

            # Clip only the rendered line endpoint to image bounds.
            # The measured angle above remains based on the full detected direction.
            dx=endx-gx
            dy=endy-gy
            tmax=1.0
            if dx > 0:
                tmax=min(tmax,(w-1-gx)/dx)
            elif dx < 0:
                tmax=min(tmax,(0-gx)/dx)
            if dy > 0:
                tmax=min(tmax,(h-1-gy)/dy)
            elif dy < 0:
                tmax=min(tmax,(0-gy)/dy)
            tmax=max(0.0,min(1.0,tmax))
            line_endx=gx+dx*tmax
            line_endy=gy+dy*tmax

            out["shaft"]["line"]={"x1":int(round(gx)),"y1":int(round(gy)),
                                  "x2":int(round(line_endx)),"y2":int(round(line_endy))}
        out["debug"]["bestScore"]=best["score"]

    os.makedirs(os.path.dirname(args.out) or ".",exist_ok=True)
    with open(args.out,"w",encoding="utf-8") as f: json.dump(out,f,indent=2)
    if args.debugImg:
        os.makedirs(os.path.dirname(args.debugImg) or ".",exist_ok=True)
        cv2.imwrite(args.debugImg,dbg)

if __name__=="__main__":
    main()
