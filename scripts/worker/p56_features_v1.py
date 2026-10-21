import math
import cv2
import numpy as np

FEATURE_SCHEMA="VCA_P56_FEATURES_V1"
BASE_FEATURE_COUNT=36
DELTA_FEATURE_COUNT=30
TOTAL_FEATURE_COUNT=66

def safe_angle(a,b):
    dx=float(b[0]-a[0]); dy=float(b[1]-a[1])
    return math.atan2(dy,dx)

def joint_angle(a,b,c):
    u=np.asarray(a,float)-np.asarray(b,float)
    v=np.asarray(c,float)-np.asarray(b,float)
    nu=np.linalg.norm(u); nv=np.linalg.norm(v)
    if nu<1e-6 or nv<1e-6:
        return 0.0
    x=float(np.clip(np.dot(u,v)/(nu*nv),-1,1))
    return math.acos(x)

def line_features(gray,hands_px):
    H,W=gray.shape[:2]
    edges=cv2.Canny(cv2.GaussianBlur(gray,(3,3),0),45,130)
    lines=cv2.HoughLinesP(
        edges,1,np.pi/180,
        threshold=max(18,int(min(H,W)*.045)),
        minLineLength=max(18,int(min(H,W)*.08)),
        maxLineGap=10
    )
    if lines is None:
        return [0.0,0.0,1.0,0.0,0.0,1.0]
    hx,hy=map(float,hands_px)
    candidates=[]
    for q in lines[:,0,:]:
        x1,y1,x2,y2=map(float,q)
        vx=x2-x1; vy=y2-y1
        L=math.hypot(vx,vy)
        if L<1:
            continue
        t=float(np.clip(((hx-x1)*vx+(hy-y1)*vy)/(L*L),0,1))
        qx=x1+t*vx; qy=y1+t*vy
        d=math.hypot(hx-qx,hy-qy)
        if d>max(H,W)*.23:
            continue
        ang=math.atan2(vy,vx)
        folded=abs(((ang+math.pi/2)%math.pi)-math.pi/2)
        score=(L/max(W,H))-0.9*(d/max(W,H))
        candidates.append((score,L/max(W,H),d/max(W,H),folded))
    if not candidates:
        return [0.0,0.0,1.0,0.0,0.0,1.0]
    candidates=sorted(candidates,reverse=True)[:3]
    out=[]
    for idx in range(2):
        if idx<len(candidates):
            _,ln,dist,aa=candidates[idx]
            out += [float(ln),float(dist),float(abs(math.sin(aa)))]
        else:
            out += [0.0,1.0,0.0]
    return out

def frame_base_features(img, view, corridor_fraction, pose_result, pose_landmark_enum):
    if pose_result is None or pose_result.pose_landmarks is None:
        return None
    l=pose_result.pose_landmarks.landmark
    LM=pose_landmark_enum
    def pt(idx):
        lm=l[idx.value]
        return np.array([float(lm.x),float(lm.y)]),float(lm.visibility)

    ls,vls=pt(LM.LEFT_SHOULDER); rs,vrs=pt(LM.RIGHT_SHOULDER)
    le,vle=pt(LM.LEFT_ELBOW); re,vre=pt(LM.RIGHT_ELBOW)
    lw,vlw=pt(LM.LEFT_WRIST); rw,vrw=pt(LM.RIGHT_WRIST)
    lh,vlh=pt(LM.LEFT_HIP); rh,vrh=pt(LM.RIGHT_HIP)

    midhip=(lh+rh)/2
    midsh=(ls+rs)/2
    sw=max(float(np.linalg.norm(ls-rs)),.03)
    hands=(lw+rw)/2

    coords=[]
    for q in [ls,rs,le,re,lw,rw,lh,rh,hands,midsh]:
        z=(q-midhip)/sw
        coords += [float(z[0]),float(z[1])]

    lead_ang=safe_angle(ls,lw)
    trail_ang=safe_angle(rs,rw)
    feats=[
        float(corridor_fraction),
        1.0 if view in ("dtl","oblique") else 0.0,
        math.sin(lead_ang),math.cos(lead_ang),
        math.sin(trail_ang),math.cos(trail_ang),
        joint_angle(ls,le,lw),joint_angle(rs,re,rw),
        float(np.linalg.norm(lw-rw)/sw),
        float(min(vls,vrs,vle,vre,vlw,vrw,vlh,vrh)),
    ] + coords

    H,W=img.shape[:2]
    hands_px=(hands[0]*W,hands[1]*H)
    feats += line_features(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY),hands_px)
    if len(feats)!=BASE_FEATURE_COUNT:
        raise RuntimeError(f"Unexpected base feature count {len(feats)}")
    return feats

def add_temporal_deltas(sequence):
    sequence=sorted(sequence,key=lambda z:z["frame"])
    if not sequence:
        return []
    base=[np.asarray(z["x"],float) for z in sequence]
    out=[]
    for j,z in enumerate(sequence):
        lo=max(0,j-1); hi=min(len(sequence)-1,j+1)
        frame_span=max(1,int(sequence[hi]["frame"])-int(sequence[lo]["frame"]))
        delta=(base[hi]-base[lo])/frame_span
        x=list(base[j])+list(delta[:DELTA_FEATURE_COUNT])
        if len(x)!=TOTAL_FEATURE_COUNT:
            raise RuntimeError(f"Unexpected total feature count {len(x)}")
        row=dict(z)
        row["x"]=x
        out.append(row)
    return out
