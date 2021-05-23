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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState([0, 0]);
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
        setPosition([evt.nativeEvent.offsetX, evt.nativeEvent.offsetY]);
        setIsPress(true);
      }
    },
    [disabled, setPosition, setIsPress]
  );

  const handleMouseUp = useCallback(
    (evt) => {
      if (!disabled) {
        if (isPress) {
          drawLine(position, [
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
    [disabled, isPress, drawLine, setIsPress, onChange, width, height, position]
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
          drawLine(position, nextPosition);
          setPosition(nextPosition);
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
      setPosition,
      onChange,
      width,
      height,
      position,
    ]
  );

  useEffect(() => {
    context && context.clearRect(0, 0, width, height);
  }, [clearRectTimeStamp, width, height]);

  useEffect(() => {
    if (imageData) {
      context?.putImageData(imageData, 0, 0);
    }
  }, [imageData, context]);

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
