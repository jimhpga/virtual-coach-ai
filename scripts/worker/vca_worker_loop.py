import argparse
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest


def http_json(url, worker_key, method="GET", payload=None, timeout=90):
    body = None
    headers = {
        "x-vca-worker-key": worker_key,
        "accept": "application/json",
    }
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["content-type"] = "application/json"

    req = urlrequest.Request(url, data=body, headers=headers, method=method)
    try:
        with urlrequest.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", errors="replace")
            return res.status, json.loads(raw) if raw else {}
    except urlerror.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = {"error": raw or str(exc)}
        return exc.code, parsed


def multipart_upload(url, worker_key, fields, file_field, file_path, timeout=120):
    boundary = "----vca-worker-" + uuid.uuid4().hex
    chunks = []

    for name, value in fields.items():
        chunks.append(f"--{boundary}\r\n".encode())
        chunks.append(
            (
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                f"{value}\r\n"
            ).encode("utf-8")
        )

    filename = os.path.basename(file_path)
    mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    chunks.append(f"--{boundary}\r\n".encode())
    chunks.append(
        (
            f'Content-Disposition: form-data; name="{file_field}"; '
            f'filename="{filename}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode("utf-8")
    )
    chunks.append(file_bytes)
    chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode())

    body = b"".join(chunks)
    headers = {
        "x-vca-worker-key": worker_key,
        "content-type": f"multipart/form-data; boundary={boundary}",
        "content-length": str(len(body)),
        "accept": "application/json",
    }
    req = urlrequest.Request(url, data=body, headers=headers, method="POST")

    try:
        with urlrequest.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", errors="replace")
            return res.status, json.loads(raw) if raw else {}
    except urlerror.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = {"error": raw or str(exc)}
        return exc.code, parsed


def short_payload(payload, limit=320):
    try:
        text = json.dumps(payload, ensure_ascii=False)
    except Exception:
        text = str(payload)
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit] + "..."


def run(cmd, cwd=None):
    print("RUN", " ".join(str(x) for x in cmd), flush=True)
    cp = subprocess.run(cmd, cwd=cwd, text=True)
    if cp.returncode != 0:
        raise RuntimeError(f"Command failed ({cp.returncode}): {' '.join(cmd)}")


def download_mux_hls(source_url, output_path):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is not available on PATH")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    copy_cmd = [
        ffmpeg,
        "-y",
        "-loglevel",
        "error",
        "-i",
        source_url,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c",
        "copy",
        output_path,
    ]
    cp = subprocess.run(copy_cmd, text=True)
    if cp.returncode == 0 and os.path.isfile(output_path) and os.path.getsize(output_path) > 1024:
        return

    transcode_cmd = [
        ffmpeg,
        "-y",
        "-loglevel",
        "error",
        "-i",
        source_url,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        output_path,
    ]
    run(transcode_cmd)

    if not os.path.isfile(output_path) or os.path.getsize(output_path) <= 1024:
        raise RuntimeError("Mux download produced no usable video")


def sanitize_patch(patch, playback_id):
    patch = dict(patch)
    patch.pop("sourceVideoFile", None)
    patch["videoUrl"] = None
    patch["sourceVideo"] = {
        "type": "mux",
        "playbackId": playback_id,
    }

    meta = dict(patch.get("meta") or {})
    worker = dict(meta.get("worker") or {})
    worker.pop("phaseMap", None)
    worker.pop("shaftFile", None)
    worker["bridge"] = "vca_windows_worker_v1"
    meta["worker"] = worker
    patch["meta"] = meta

    return patch


def upload_pframes(base_url, worker_key, job_id, patch):
    asset_url = base_url.rstrip("/") + "/api/analysis-worker/asset"
    frames = patch.get("pframes") or []

    for frame in frames:
        phase = str(frame.get("label") or f"P{frame.get('p', '')}").upper()
        local_path = frame.get("imageFile")
        if not local_path or not os.path.isfile(local_path):
            frame.pop("imageFile", None)
            continue

        status, payload = multipart_upload(
            asset_url,
            worker_key,
            {"id": job_id, "phase": phase},
            "file",
            local_path,
        )
        if status != 200 or not payload.get("ok") or not payload.get("url"):
            raise RuntimeError(
                f"Asset upload failed for {phase}: HTTP {status} {payload}"
            )

        frame["imageUrl"] = payload["url"]
        frame["thumbUrl"] = payload["url"]
        frame.pop("imageFile", None)

    return patch


def complete_job(base_url, worker_key, job_id, lease_id, report_patch=None, error=None):
    endpoint = base_url.rstrip("/") + "/api/analysis-worker/complete"
    payload = {
        "id": job_id,
        "leaseId": lease_id,
    }
    if report_patch is not None:
        payload["reportPatch"] = report_patch
    if error:
        payload["error"] = str(error)[:2000]

    status, response = http_json(
        endpoint,
        worker_key,
        method="POST",
        payload=payload,
        timeout=120,
    )
    if status != 200 or not response.get("ok"):
        raise RuntimeError(
            f"Complete failed: HTTP {status} {short_payload(response)}"
        )
    return response


def process_job(job, args):
    job_id = str(job["id"])
    lease_id = str(job["leaseId"])
    playback_id = str(job["muxPlaybackId"])
    source_url = str(job["sourceUrl"])

    work_dir = os.path.join(os.path.abspath(args.workRoot), job_id)
    os.makedirs(work_dir, exist_ok=True)
    source_path = os.path.join(work_dir, "source.mp4")
    analysis_dir = os.path.join(work_dir, "analysis")

    if os.path.isdir(analysis_dir):
        shutil.rmtree(analysis_dir)
    os.makedirs(analysis_dir, exist_ok=True)

    print(f"JOB {job_id} attempt={job.get('attempt')} playback={playback_id}", flush=True)

    download_mux_hls(source_url, source_path)

    analyzer = os.path.join(args.repo, "scripts", "worker", "vca_analyze_local.py")
    run(
        [
            sys.executable,
            analyzer,
            "--video",
            source_path,
            "--outDir",
            analysis_dir,
            "--repo",
            args.repo,
        ]
    )

    patch_path = os.path.join(analysis_dir, "report_patch.json")
    if not os.path.isfile(patch_path):
        raise RuntimeError("Analyzer did not create report_patch.json")

    with open(patch_path, "r", encoding="utf-8") as f:
        patch = json.load(f)

    patch = sanitize_patch(patch, playback_id)
    patch = upload_pframes(args.baseUrl, args.workerKey, job_id, patch)

    response = complete_job(
        args.baseUrl,
        args.workerKey,
        job_id,
        lease_id,
        report_patch=patch,
    )
    print(
        json.dumps(
            {
                "completed": job_id,
                "analysisStatus": response.get("analysisStatus"),
                "reportUrl": response.get("reportUrl"),
            },
            indent=2,
        ),
        flush=True,
    )


def claim_next(args):
    endpoint = args.baseUrl.rstrip("/") + "/api/analysis-worker/next"
    status, payload = http_json(endpoint, args.workerKey, timeout=90)
    if status != 200 or not payload.get("ok"):
        raise RuntimeError(
            f"Claim failed: HTTP {status} {short_payload(payload)}"
        )
    return payload.get("job")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--baseUrl",
        default=os.environ.get("VCA_BASE_URL", "https://virtualcoachai.net"),
    )
    ap.add_argument(
        "--workerKey",
        default=os.environ.get("VCA_WORKER_KEY", ""),
    )
    ap.add_argument(
        "--workerKeyFile",
        default=os.environ.get(
            "VCA_WORKER_KEY_FILE",
            r"E:\VCA\secrets\vca_worker.key",
        ),
    )
    ap.add_argument(
        "--repo",
        default=str(Path(__file__).resolve().parents[2]),
    )
    ap.add_argument(
        "--workRoot",
        default=os.environ.get(
            "VCA_WORK_ROOT",
            r"E:\VCA\_runs\production_worker",
        ),
    )
    ap.add_argument("--pollSec", type=float, default=15.0)
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()

    args.repo = os.path.abspath(args.repo)
    args.workRoot = os.path.abspath(args.workRoot)

    if not args.workerKey and args.workerKeyFile:
        key_file = os.path.abspath(args.workerKeyFile)
        if os.path.isfile(key_file):
            with open(key_file, "r", encoding="ascii") as f:
                args.workerKey = f.read().strip()

    if not args.workerKey:
        raise SystemExit(
            "Worker key is required. Set VCA_WORKER_KEY or create the local worker key file."
        )

    print(
        f"VCA worker online base={args.baseUrl} root={args.workRoot}",
        flush=True,
    )

    while True:
        job = None
        try:
            job = claim_next(args)
            if not job:
                if args.once:
                    print("No queued job.", flush=True)
                    return
                time.sleep(max(2.0, args.pollSec))
                continue

            try:
                process_job(job, args)
            except Exception as exc:
                print(f"JOB_ERROR {job.get('id')}: {exc}", file=sys.stderr, flush=True)
                try:
                    complete_job(
                        args.baseUrl,
                        args.workerKey,
                        str(job["id"]),
                        str(job["leaseId"]),
                        error=str(exc),
                    )
                except Exception as complete_exc:
                    print(
                        f"ERROR_REPORT_FAILED {job.get('id')}: {complete_exc}",
                        file=sys.stderr,
                        flush=True,
                    )

            if args.once:
                return

        except KeyboardInterrupt:
            print("Worker stopped.", flush=True)
            return
        except Exception as exc:
            print(f"WORKER_ERROR: {exc}", file=sys.stderr, flush=True)
            if args.once:
                raise
            time.sleep(max(5.0, args.pollSec))


if __name__ == "__main__":
    main()
