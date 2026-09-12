import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { Crosshair, Eye, EyeOff, ImagePlus, XIcon, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { photoFields } from "@/lib/metrics";
import { toDataUrl } from "@/lib/photo";
import { cn } from "@/lib/utils";
import type { EvaluationPhotoKey, PhotoReference } from "@/types";

const referenceTabLabels: Record<EvaluationPhotoKey, string> = {
  photoFront: "Frontal",
  photoSideRight: "Lat. Direita",
  photoSideLeft: "Lat. Esquerda",
  photoBack: "Costas",
};

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

export const ASPECT_1_2: AspectOption = ASPECT_OPTIONS[1];
export const ASPECT_1_1: AspectOption = ASPECT_OPTIONS[3];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;
const OUTPUT_MAX_EDGE = 640;
const PREVIEW_MAX_WIDTH = 420;
const PREVIEW_MAX_HEIGHT = 340;

interface PhotoEditorModalProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (base64Png: string) => void;
  /** Restricts the selectable aspect ratios. When a single option is given, the selector is hidden. */
  allowedAspects?: AspectOption[];
  /** Member photos offered as a visual alignment guide. Never included in the exported image. */
  references?: PhotoReference[];
}

export function PhotoEditorModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  allowedAspects = ASPECT_OPTIONS,
  references = [],
}: PhotoEditorModalProps) {
  const [aspect, setAspect] = useState<AspectOption>(allowedAspects[0]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [reference, setReference] = useState<PhotoReference | null>(null);
  const [referenceVisible, setReferenceVisible] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    setAspect(allowedAspects[0]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNaturalSize({ width: 0, height: 0 });
    setReference(null);
    setReferenceVisible(true);
    setPickerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const referenceFieldLabel = reference
    ? (photoFields.find((field) => field.key === reference.fieldKey)?.label ?? "")
    : "";
  const defaultReferenceAngle =
    reference?.fieldKey ??
    photoFields.find((field) =>
      references.some((item) => item.fieldKey === field.key),
    )?.key ??
    "photoFront";

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
    // Keep the crop aspect ratio, but cap the longest side at 640px to keep
    // stored photos small (already PNG; output width/height are even numbers to
    // reduce PNG size).
    const aspectRatio = aspect.w / aspect.h;
    const outputWidth =
      aspectRatio >= 1 ? OUTPUT_MAX_EDGE : Math.round(OUTPUT_MAX_EDGE * aspectRatio);
    const outputHeight =
      aspectRatio >= 1 ? Math.round(OUTPUT_MAX_EDGE / aspectRatio) : OUTPUT_MAX_EDGE;
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

        {allowedAspects.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {allowedAspects.map((option) => (
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
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={references.length === 0}
              onClick={() => setPickerOpen((value) => !value)}
            >
              <ImagePlus /> {reference ? "Trocar referência" : "Adicionar referência"}
            </Button>
            {reference && (
              <div className="flex min-w-0 items-center gap-1">
                <span className="text-muted-foreground truncate text-xs">
                  {referenceFieldLabel} — Avaliação Nº {reference.evaluationNumber} (
                  {formatDate(reference.date)})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={referenceVisible ? "Ocultar referência" : "Mostrar referência"}
                  title={referenceVisible ? "Ocultar referência" : "Mostrar referência"}
                  onClick={() => setReferenceVisible((value) => !value)}
                >
                  {referenceVisible ? <EyeOff /> : <Eye />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover referência"
                  title="Remover referência"
                  onClick={() => {
                    setReference(null);
                    setReferenceVisible(true);
                  }}
                >
                  <XIcon />
                </Button>
              </div>
            )}
          </div>

          {pickerOpen && (
            <div className="border-border rounded-md border p-2">
              {references.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma foto disponível para referência.
                </p>
              ) : (
                <Tabs defaultValue={defaultReferenceAngle}>
                  <TabsList className="w-full">
                    {photoFields.map((field) => (
                      <TabsTrigger key={field.key} value={field.key}>
                        {referenceTabLabels[field.key]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {photoFields.map((field) => {
                    const items = references.filter(
                      (item) => item.fieldKey === field.key,
                    );
                    return (
                      <TabsContent
                        key={field.key}
                        value={field.key}
                        className="max-h-40 overflow-y-auto"
                      >
                        {items.length === 0 ? (
                          <p className="text-muted-foreground py-4 text-center text-sm">
                            Nenhuma foto deste ângulo.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {items.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                aria-label={`Usar ${field.label} da avaliação ${item.evaluationNumber} como referência`}
                                onClick={() => {
                                  setReference(item);
                                  setReferenceVisible(true);
                                  setPickerOpen(false);
                                }}
                                className={cn(
                                  "hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border p-2 text-left transition-colors",
                                  reference?.id === item.id && "ring-primary ring-2",
                                )}
                              >
                                <span className="bg-muted flex aspect-1/2 h-12 shrink-0 items-center justify-center overflow-hidden rounded">
                                  <img
                                    src={toDataUrl(item.photo)}
                                    alt=""
                                    className="size-full object-contain"
                                  />
                                </span>
                                <span className="text-sm font-medium">
                                  {formatDate(item.date)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </div>
          )}
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
          {reference && referenceVisible && (
            <img
              src={toDataUrl(reference.photo)}
              alt="Foto de referência"
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full object-contain"
              style={{ opacity: 0.5 }}
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

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
