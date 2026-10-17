"use client";
import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
/** Re-measure on value/width changes; never shrink the text to fit its container. */
export default function AutoTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const resize = () => {
      node.style.height = "auto";
      node.style.height = node.scrollHeight + "px";
    };
    resize();
    const observer = new ResizeObserver(() => {
      if (node.clientWidth !== width) {
        width = node.clientWidth;
        resize();
      }
    });
    let width = node.clientWidth;
    observer.observe(node);
    return () => observer.disconnect();
  }, [props.value]);
  return (
    <textarea
      {...props}
      ref={ref}
      rows={2}
      style={{ ...props.style, resize: "none", overflowY: "hidden" }}
    />
  );
}
