// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// High-DPI Touch-Optimized Electronic Signature Canvas for iPad & Tablets
// ==============================================================================

"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

export interface DigitalSignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

interface DigitalSignaturePadProps {
  onSignatureChange?: (isEmpty: boolean) => void;
  height?: number;
}

export const DigitalSignaturePad = forwardRef<DigitalSignaturePadHandle, DigitalSignaturePadProps>(
  function DigitalSignaturePad({ onSignatureChange, height = 180 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const hasDrawnRef = useRef(false);
    const [, setRenderTrigger] = useState(0);

    const getCanvasPos = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasPos(clientX, clientY);
      isDrawingRef.current = true;
      hasDrawnRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
      onSignatureChange?.(false);
      setRenderTrigger((prev) => prev + 1);
    };

    const draw = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasPos(clientX, clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx?.closePath();
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawnRef.current = false;
      onSignatureChange?.(true);
      setRenderTrigger((prev) => prev + 1);
    };

    useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      isEmpty: () => !hasDrawnRef.current,
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawnRef.current) return "";
        return canvas.toDataURL("image/png");
      },
    }));

    // Setup high-DPI scaling on mount / resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#0f172a"; // Deep navy ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    return (
      <div className="space-y-2">
        <div
          className="relative w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-white transition-colors overflow-hidden touch-none"
          style={{ height: `${height}px` }}
        >
          {/* Watermark / Guidance line */}
          <div className="absolute inset-x-6 bottom-8 border-b border-slate-300 pointer-events-none flex items-center justify-between text-[11px] text-slate-400 select-none">
            <span className="flex items-center gap-1 font-serif italic">
              <PenTool size={12} className="text-rose-600" /> Sign above this line
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-300">
              Electronic Signature
            </span>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
            onMouseMove={(e) => draw(e.clientX, e.clientY)}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              if (touch) startDrawing(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              if (touch) draw(touch.clientX, touch.clientY);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopDrawing();
            }}
          />

          {/* Quick Clear Button in Top Right */}
          <button
            type="button"
            onClick={clearCanvas}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      </div>
    );
  }
);

