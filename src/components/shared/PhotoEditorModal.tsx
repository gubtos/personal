import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { Crosshair, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AspectOption {
  label: string;
  w: number;
  h: number;
}

const ASPECT_OPTIONS: AspectOption[] = [
  { label: "2:3", w: 2, h: 3 },
  { label: "1:2", w: 1, h: 2 },
  { label: "3:5", w: 3, h: 5 },
  { label: "1:1", w: 1, h: 1 },
];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;
const OUTPUT_WIDTH = 960;
const PREVIEW_MAX_WIDTH = 420;
const PREVIEW_MAX_HEIGHT = 340;

interface PhotoEditorModalProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (base64Png: string) => void;
}

export function PhotoEditorModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
}: PhotoEditorModalProps) {
  const [aspect, setAspect] = useState<AspectOption>(ASPECT_OPTIONS[0]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAspect(ASPECT_OPTIONS[0]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNaturalSize({ width: 0, height: 0 });
  }, [open, imageSrc]);

  useEffect(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [containerEl]);

  const baseScale = useMemo(() => {
    if (
      !naturalSize.width ||
      !naturalSize.height ||
      !containerSize.width ||
      !containerSize.height
    ) {
      return 0;
    }
    return Math.min(
      containerSize.width / naturalSize.width,
      containerSize.height / naturalSize.height,
    );
  }, [naturalSize, containerSize]);

  const renderWidth = naturalSize.width * baseScale;
  const renderHeight = naturalSize.height * baseScale;

  const previewSize = useMemo(() => {
    const widthFromHeight = (PREVIEW_MAX_HEIGHT * aspect.w) / aspect.h;
    const width = Math.min(PREVIEW_MAX_WIDTH, widthFromHeight);
    const height = (width * aspect.h) / aspect.w;
    return { width, height };
  }, [aspect]);

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleAspectChange(option: AspectOption) {
    setAspect(option);
    resetView();
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    dragState.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore — pointer may already be released
    }
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function handleConfirm() {
    if (!imgRef.current || !containerSize.width || !containerSize.height) return;
    const outputWidth = OUTPUT_WIDTH;
    const outputHeight = Math.round((OUTPUT_WIDTH * aspect.h) / aspect.w);
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = outputWidth / containerSize.width;
    const dWidth = renderWidth * zoom * ratio;
    const dHeight = renderHeight * zoom * ratio;
    const dx = outputWidth / 2 - dWidth / 2 + pan.x * ratio;
    const dy = outputHeight / 2 - dHeight / 2 + pan.y * ratio;

    ctx.clearRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(imgRef.current, dx, dy, dWidth, dHeight);

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);
    onConfirm(base64);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle>Ajustar Foto</DialogTitle>
              <DialogDescription>
                Centralize a imagem, ajuste o zoom e escolha a proporção do recorte.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleConfirm}>
                Aplicar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {ASPECT_OPTIONS.map((option) => (
            <Button
              key={option.label}
              type="button"
              size="sm"
              variant={option.label === aspect.label ? "default" : "outline"}
              onClick={() => handleAspectChange(option)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className={cn(
            "photo-editor-checkerboard relative mx-auto touch-none overflow-hidden rounded-md border select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ width: previewSize.width, height: previewSize.height }}
        >
          {imageSrc && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Prévia da foto"
              draggable={false}
              onLoad={(e) => {
                const target = e.currentTarget;
                setNaturalSize({
                  width: target.naturalWidth,
                  height: target.naturalHeight,
                });
              }}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: renderWidth || undefined,
                height: renderHeight || undefined,
                transform: `translate(${pan.x}px, ${pan.y}px) translate(-50%, -50%) scale(${zoom})`,
                transformOrigin: "center",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Diminuir zoom"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP))}
          >
            <ZoomOut />
          </Button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="accent-primary h-2 w-40"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Aumentar zoom"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP))}
          >
            <ZoomIn />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Centralizar"
            onClick={resetView}
          >
            <Crosshair />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
