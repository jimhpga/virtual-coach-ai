import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET  = process.env.S3_BUCKET;            // e.g. "virtualcoachai-swings"
const REGION  = process.env.AWS_REGION;           // provided by Lambda at runtime
const STATUS  = process.env.S3_STATUS_PREFIX  || "status";
const REPORTS = process.env.S3_REPORT_PREFIX  || "reports";
const UPLOADS = process.env.S3_UPLOAD_PREFIX  || "uploads";

const s3 = new S3Client({ region: REGION });

// "uploads/xxx.webm" -> "xxx"
function jobIdFromKey(k) {
  return String(k).replace(new RegExp(`^${UPLOADS}/`), "").replace(/\.[^.]+$/, "");
}

export const handler = async (event) => {
  for (const rec of event.Records || []) {
    const key = decodeURIComponent(rec.s3.object.key.replace(/\+/g, " "));
    if (!key.startsWith(`${UPLOADS}/`)) continue;

    const jobId    = jobIdFromKey(key);
    const reportKey = `${REPORTS}/${jobId}.json`;
    const statusKey = `${STATUS}/${jobId}.json`;

    // TODO: replace this stub with your real analysis
    const report = {
      status: "ready",
      meta: { jobId, sourceKey: key, fps: 240, club: "7i" },
      checkpoints: [
        { p:1, label:"Setup" }, { p:2 }, { p:3 }, { p:4 }, { p:5 }, { p:6 },
        { p:7, label:"Impact" }, { p:8 }, { p:9, label:"Finish" }
      ],
      faults: [
        { code:"FACE_OPEN_P6", severity:"med", note:"Face a touch open near P6" },
        { code:"EARLY_EXT",    severity:"low", note:"Slight early extension" }
      ],
      drills: [
        { for:"FACE_OPEN_P6", title:"Knuckle Down at P6", how:"Half swings with lead wrist flexed through P6" },
        { for:"EARLY_EXT",    title:"Wall Butt Drill",    how:"Keep glutes on the wall through impact" }
      ]
    };

    // 1) write report
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: reportKey,
      Body: JSON.stringify(report),
      ContentType: "application/json",
      ServerSideEncryption: "AES256"
    }));

    // 2) flip status -> ready
    const status = { status:"ready", reportBucket: BUCKET, reportKey };
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: statusKey,
      Body: JSON.stringify(status),
      ContentType: "application/json",
      ServerSideEncryption: "AES256"
    }));
  }
  return { ok:true };
};