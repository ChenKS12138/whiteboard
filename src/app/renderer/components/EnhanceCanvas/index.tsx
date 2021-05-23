import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface IEnhanceCanvas {
  disabled: boolean;
  width: number;
  height: number;
  onChange?: (bitmap: Uint8Array) => void;
  clearRectTimeStamp?: number;
  imageData?: ImageData | null;
}

export default function EnhanceCanvas({
  disabled,
  height,
  width,
  onChange,
  clearRectTimeStamp,
  imageData,
}: IEnhanceCanvas) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const positionRef = useRef([0, 0]);
  const [isPress, setIsPress] = useState(false);

  const context = useMemo(() => {
    return canvasRef.current && canvasRef.current.getContext("2d");
  }, [canvasRef, canvasRef.current, canvasRef.current?.getContext]);

  const drawLine = useCallback(
    ([x1, y1], [x2, y2]) => {
      if (context) {
        context.beginPath();
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
      }
    },
    [context]
  );

  const handleMouseDown = useCallback(
    (evt) => {
      if (!disabled) {
        positionRef.current = [
          evt.nativeEvent.offsetX,
          evt.nativeEvent.offsetY,
        ];
        setIsPress(true);
      }
    },
    [disabled, positionRef, setIsPress]
  );

  const handleMouseUp = useCallback(
    (evt) => {
      if (!disabled) {
        if (isPress) {
          drawLine(positionRef.current, [
            evt.nativeEvent.offsetX,
            evt.nativeEvent.offsetY,
          ]);
          setIsPress(false);
          onChange?.(
            Uint8Array.from(
              context?.getImageData(0, 0, width, height).data || []
            )
          );
        }
      }
    },
    [
      disabled,
      isPress,
      drawLine,
      setIsPress,
      onChange,
      width,
      height,
      positionRef,
    ]
  );

  const handleMouseMove = useCallback(
    (evt) => {
      if (!disabled) {
        if (
          isPress &&
          evt.nativeEvent.offsetX <= width &&
          evt.nativeEvent.offsetY <= height
        ) {
          const nextPosition = [
            evt.nativeEvent.offsetX,
            evt.nativeEvent.offsetY,
          ];
          drawLine(positionRef.current, nextPosition);
          positionRef.current = nextPosition;
          onChange?.(
            Uint8Array.from(
              context?.getImageData(0, 0, width, height).data || []
            )
          );
        }
      }
    },
    [
      disabled,
      isPress,
      width,
      height,
      drawLine,
      positionRef,
      onChange,
      width,
      height,
    ]
  );

  useEffect(() => {
    context && context.clearRect(0, 0, width, height);
    onChange?.(
      Uint8Array.from(context?.getImageData(0, 0, width, height).data || [])
    );
  }, [clearRectTimeStamp, width, height, onChange]);

  useEffect(() => {
    if (
      imageData &&
      (!imageDataRef.current || imageDataRef.current !== imageData)
    ) {
      context?.putImageData(imageData, 0, 0);
      imageDataRef.current = imageData;
    }
  }, [imageData, context, imageDataRef]);

  return (
    <canvas
      ref={canvasRef}
      className="cav"
      data-disabled={disabled}
      height={height}
      width={width}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    />
  );
}
