"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  X,
  AlertTriangle,
  Upload,
  SwitchCamera,
  ShieldCheck,
  Clock,
  Building2,
  User,
  Sparkles,
} from "lucide-react";

interface SelfieCaptureModalProps {
  mode: "time_in" | "time_out";
  employeeName: string;
  branchName: string;
  onClose: () => void;
  onConfirm: (photoDataUrl: string, notes?: string) => Promise<void>;
  loading?: boolean;
}

export function SelfieCaptureModal({
  mode,
  employeeName,
  branchName,
  onClose,
  onConfirm,
  loading = false,
}: SelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [flash, setFlash] = useState(false);

  // Live timestamp for watermark
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraActive(false);

    // Stop existing stream if running
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this browser or device.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const message =
        err instanceof Error
          ? err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : err.message
          : "Unable to access camera.";
      setCameraError(message);
    }
  }, [facingMode]);

  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera, capturedPhoto]);

  // Toggle front/back camera (for mobile / tablets)
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Capture snapshot from video with branded watermark
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Trigger visual flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // Mirror horizontal if using front camera
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Reset transform for drawing watermark
    if (facingMode === "user") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Watermark overlay bar
    const barHeight = Math.max(50, Math.round(height * 0.12));
    ctx.fillStyle = "rgba(10, 15, 29, 0.82)";
    ctx.fillRect(0, height - barHeight, width, barHeight);

    // Watermark text
    const fontSize = Math.max(13, Math.round(width * 0.024));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "#F59E0B"; // Amber / Gold
    const brandText = "✨ CINDYRELLA CLINIC — ATTENDANCE VERIFIED";
    ctx.fillText(brandText, 16, height - barHeight + fontSize + 6);

    ctx.font = `${fontSize * 0.85}px sans-serif`;
    ctx.fillStyle = "#E2E8F0";
    const infoText = `${employeeName} • ${branchName} • ${currentTimeStr}`;
    ctx.fillText(infoText, 16, height - 12);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);

    // Stop camera stream while previewing photo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Fallback: File upload if camera fails
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        const maxDim = 1000;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const barHeight = Math.max(45, Math.round(h * 0.1));
          ctx.fillStyle = "rgba(10, 15, 29, 0.82)";
          ctx.fillRect(0, h - barHeight, w, barHeight);
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#F59E0B";
          ctx.fillText("✨ CINDYRELLA CLINIC — ATTENDANCE VERIFIED", 14, h - barHeight + 20);
          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#E2E8F0";
          ctx.fillText(`${employeeName} • ${branchName} • ${currentTimeStr}`, 14, h - 10);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setCapturedPhoto(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Confirm and submit
  const handleConfirm = async () => {
    if (!capturedPhoto) return;
    await onConfirm(capturedPhoto, notes);
  };

  const isTimeIn = mode === "time_in";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6 animate-fade-in">
      <div className="relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                isTimeIn ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}
            >
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-white">
                  {isTimeIn ? "Selfie Time-In Verification" : "Selfie Time-Out Verification"}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  <ShieldCheck size={11} /> Anti-Cheat
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Please take a clear selfie inside the clinic to clock {isTimeIn ? "in" : "out"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Staff & Clinic Info Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-slate-950/60 px-5 py-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <User size={13} className="text-amber-400" />
            <span>{employeeName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Building2 size={13} className="text-emerald-400" />
            <span>{branchName}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300">
            <Clock size={12} />
            <span>{currentTimeStr || "Live Time"}</span>
          </div>
        </div>

        {/* Camera Viewport / Captured Preview */}
        <div className="relative flex min-h-[300px] sm:min-h-[360px] flex-1 items-center justify-center overflow-hidden bg-black">
          {/* Flash Effect */}
          {flash && <div className="absolute inset-0 z-40 bg-white transition-opacity duration-200" />}

          {capturedPhoto ? (
            /* PREVIEW OF CAPTURED PHOTO */
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedPhoto}
                alt="Captured selfie preview"
                className="h-full w-full object-contain max-h-[380px]"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                <CheckCircle2 size={14} /> Photo Verified
              </div>
            </div>
          ) : cameraError ? (
            /* CAMERA ERROR / FALLBACK STATE */
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 rounded-full bg-amber-500/20 p-3 text-amber-400">
                <AlertTriangle size={32} />
              </div>
              <p className="max-w-xs text-xs font-medium text-slate-300 mb-4">{cameraError}</p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                >
                  <RefreshCw size={14} /> Retry Camera
                </button>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-royal px-4 py-2.5 text-xs font-semibold text-white hover:bg-royal/90 transition shadow-md">
                  <Upload size={14} /> Take / Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          ) : (
            /* LIVE WEBCAM FEED */
            <div className="relative h-full w-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover max-h-[380px] ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />

              {/* Face Guide Oval */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-44 sm:h-64 sm:w-52 rounded-[50%] border-2 border-dashed border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse" />
              </div>

              {/* Instructions banner */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3.5 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md shadow-md border border-white/10">
                Center your face in the oval
              </div>

              {/* Camera flip button */}
              <button
                type="button"
                onClick={toggleCamera}
                title="Switch Camera"
                className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-2.5 text-white backdrop-blur-md hover:bg-white/20 transition border border-white/10"
              >
                <SwitchCamera size={16} />
              </button>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        {/* Optional notes input */}
        <div className="border-t border-white/10 bg-slate-950 px-5 pt-3 pb-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional clock-in notes (e.g. Opening duty, On schedule)..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950/90 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
          >
            Cancel
          </button>

          {capturedPhoto ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
              >
                <RefreshCw size={14} /> Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition ${
                  isTimeIn
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40"
                } ${loading ? "opacity-75 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Confirm & {isTimeIn ? "Time In" : "Time Out"}
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={!cameraActive || loading}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition ${
                cameraActive
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/40"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Camera size={16} />
              Take Selfie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
