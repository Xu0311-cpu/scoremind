"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { NotatedTimelineData } from "./NotatedTimeline";
import { locateWrittenMeasure } from "./scoreMeasureNavigation";

export default function ScorePreview({ xml, timeline, selectedMeasureIndex, navigationToken }: {
  xml: string | null;
  timeline?: NotatedTimelineData | null;
  selectedMeasureIndex: number | null;
  navigationToken: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const pointConstructorRef = useRef<typeof import("opensheetmusicdisplay")["PointF2D"] | null>(null);
  const marksRef = useRef<Node[]>([]);
  const lastNavigationRef = useRef(navigationToken);
  const [renderRevision, setRenderRevision] = useState(0);
  const [renderError, setRenderError] = useState(false);
  const [locationMessage, setLocationMessage] = useState("乐谱尚未渲染，暂不可定位。");

  function clearMarks() {
    for (const mark of marksRef.current) mark.parentNode?.removeChild(mark);
    marksRef.current = [];
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !xml) return;
    const xmlToRender = xml;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    setRenderError(false);
    setLocationMessage("乐谱正在渲染，暂不可定位。");
    container.innerHTML = "";

    async function renderScore() {
      if (!container) return;
      try {
        const { OpenSheetMusicDisplay, PointF2D } = await import("opensheetmusicdisplay");
        if (cancelled) return;
        const osmd = new OpenSheetMusicDisplay(container, { autoResize: false, drawTitle: true });
        await osmd.load(xmlToRender);
        if (cancelled) return;
        osmd.render();
        osmdRef.current = osmd;
        pointConstructorRef.current = PointF2D;
        setRenderRevision((revision) => revision + 1);

        let previousWidth = container.getBoundingClientRect().width;
        observer = new ResizeObserver(() => {
          const width = container.getBoundingClientRect().width;
          if (cancelled || width <= 0 || Math.abs(width - previousWidth) < 1) return;
          previousWidth = width;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (cancelled) return;
            try {
              clearMarks();
              osmd.render();
              setRenderRevision((revision) => revision + 1);
            } catch {
              osmdRef.current = null;
              setRenderError(true);
              setLocationMessage("谱面重排失败，无法安全定位。");
            }
          }, 150);
        });
        observer.observe(container);
      } catch {
        if (cancelled) return;
        container.innerHTML = "";
        osmdRef.current = null;
        setRenderError(true);
        setLocationMessage("乐谱渲染失败，无法定位；后端分析仍可独立运行。");
      }
    }
    void renderScore();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      clearMarks();
      osmdRef.current = null;
      pointConstructorRef.current = null;
    };
  }, [xml]);

  useEffect(() => {
    clearMarks();
    const osmd = osmdRef.current;
    const PointF2D = pointConstructorRef.current;
    if (!osmd || !PointF2D) return;
    const location = locateWrittenMeasure(osmd, timeline, selectedMeasureIndex);
    if (location.status === "unavailable") {
      setLocationMessage(location.reason);
      return;
    }
    try {
      for (const outline of location.outlines) {
        const points = [
          new PointF2D(outline.left, outline.top),
          new PointF2D(outline.right, outline.top),
          new PointF2D(outline.right, outline.bottom),
          new PointF2D(outline.left, outline.bottom),
        ];
        for (let side = 0; side < points.length; side++) {
          const mark = osmd.Drawer.DrawOverlayLine(points[side], points[(side + 1) % points.length], outline.page, "#1d6f63", 0.2);
          if (!mark) throw new Error("OSMD did not return a highlight node.");
          marksRef.current.push(mark);
        }
      }
      const firstMark = marksRef.current[0];
      if (navigationToken !== lastNavigationRef.current && firstMark instanceof Element) {
        firstMark.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      lastNavigationRef.current = navigationToken;
      setLocationMessage(`已定位书面第 ${selectedMeasureIndex} 小节；标框覆盖本小节的各谱表，不定位单个音符。`);
    } catch {
      clearMarks();
      setLocationMessage("谱面标记未能安全绘制，已取消高亮。请查看技术证据中的文字来源。");
    }
    return clearMarks;
  }, [timeline, selectedMeasureIndex, navigationToken, renderRevision]);

  return (
    <div className="score-preview-wrap">
      {!xml && <p className="empty-state">正在读取 MusicXML 乐谱预览...</p>}
      {renderError && <div className="inline-warning">Score rendering failed, but analysis may still work. / 乐谱预览渲染失败，但分析可能仍可进行。</div>}
      <p className={locationMessage.startsWith("已定位") ? "score-location-status" : "score-location-status timeline-caution"} role="status">{locationMessage}</p>
      <div ref={containerRef} className="score-preview" aria-label="Rendered MusicXML score preview" />
    </div>
  );
}
