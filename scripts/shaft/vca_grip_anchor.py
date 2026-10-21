import argparse, json, os
import cv2
import mediapipe as mp

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--img",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    img=cv2.imread(args.img)
    if img is None:
        raise RuntimeError(f"Failed to read image: {args.img}")
    h,w=img.shape[:2]

    pose=mp.solutions.pose.Pose(
        static_image_mode=True,
        model_complexity=2,
        enable_segmentation=False,
        min_detection_confidence=0.5
    )
    res=pose.process(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
    pose.close()

    out={
        "ok":False,
        "source":"mediapipe_wrist_anchor_v1",
        "image":args.img,
        "x":None,"y":None,"x_px":None,"y_px":None,
        "confidence":0,
        "status":"missing",
        "left":None,"right":None,
        "strategy":None
    }

    if not res.pose_landmarks:
        out["reason"]="no_pose"
    else:
        lm=res.pose_landmarks.landmark
        l=lm[15]; r=lm[16]
        left={"x":float(l.x),"y":float(l.y),"v":float(l.visibility)}
        right={"x":float(r.x),"y":float(r.y),"v":float(r.visibility)}
        out["left"]=left; out["right"]=right

        vis_l=max(0.0,min(1.0,left["v"]))
        vis_r=max(0.0,min(1.0,right["v"]))
        diff=abs(vis_l-vis_r)

        # Hands are adjacent on the grip. If one wrist is much less visible,
        # trusting the visible wrist is safer than averaging in a hallucinated point.
        if max(vis_l,vis_r) < 0.20:
            out["reason"]="wrists_not_visible"
        else:
            if diff >= 0.30:
                best=left if vis_l>=vis_r else right
                x,y=best["x"],best["y"]
                anchor_conf=max(vis_l,vis_r)
                strategy="best_visible_wrist"
            else:
                total=max(1e-6,vis_l+vis_r)
                x=(left["x"]*vis_l+right["x"]*vis_r)/total
                y=(left["y"]*vis_l+right["y"]*vis_r)/total
                # confidence rewards both wrists, but does not require both perfect
                anchor_conf=0.65*max(vis_l,vis_r)+0.35*min(vis_l,vis_r)
                strategy="visibility_weighted_pair"

            # Clamp only small MediaPipe edge excursions; reject gross errors.
            if not (-0.08 <= x <= 1.08 and -0.08 <= y <= 1.08):
                out["reason"]="anchor_out_of_frame"
            else:
                x=max(0.0,min(1.0,x)); y=max(0.0,min(1.0,y))
                out.update({
                    "ok":True,
                    "x":x,"y":y,
                    "x_px":x*w,"y_px":y*h,
                    "confidence":int(round(anchor_conf*100)),
                    "status":"strong" if anchor_conf>=0.55 else ("usable" if anchor_conf>=0.30 else "low_confidence"),
                    "strategy":strategy
                })

    os.makedirs(os.path.dirname(args.out) or ".",exist_ok=True)
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,indent=2)

if __name__=="__main__":
    main()
