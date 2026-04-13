import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent, SectionTitle } from "./ui";
import { MAIN_COLORS } from "../../styles/theme";

export default function HusenseHeatmapCard() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 使用 Canvas 来绘制高性能的热力图
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 使用你主入口的真实 Space ID
  const spaceId = "b9c17619-be37-4c6a-a1f3-45e08fd3466c";

  useEffect(() => {
    let isMounted = true;

    const fetchRealHeatmap = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const dateObj = new Date(selectedDate);
        const startTimestamp = dateObj.getTime();
        const endTimestamp = startTimestamp + 86400000;

        const response = await fetch(
          `http://localhost:3000/api/husense/historical?spaceId=${spaceId}&startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        
        // 确保数据结构正确
        if (isMounted && data && data.width && data.height && data.data) {
          drawHeatmap(data.width, data.height, data.data);
        } else if (isMounted) {
          throw new Error("Invalid heatmap data format received.");
        }

      } catch (err: any) {
        console.error("Heatmap rendering error:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRealHeatmap();

    return () => { isMounted = false; };
  }, [selectedDate]);

  // 核心绘图引擎：将扁平数组变成彩色热力图
  const drawHeatmap = (width: number, height: number, dataArray: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置画布内部分辨率与雷达网格一致
    canvas.width = width;
    canvas.height = height;

    // 找出数据里的最大值，用来做颜色映射的标尺
    const maxVal = Math.max(...dataArray, 1); // 至少为 1，防止全 0 报错

    // 清空上一张图
    ctx.clearRect(0, 0, width, height);

    // 遍历这 11025 个像素点
    for (let i = 0; i < dataArray.length; i++) {
      const value = dataArray[i];
      if (value === 0) continue; // 如果没人走，就不画，保持透明底色

      // 计算这个点在 105x105 网格里的 x 和 y 坐标
      const x = i % width;
      const y = Math.floor(i / width);

      // 计算颜色的强度 (0.0 到 1.0 之间)
      const intensity = value / maxVal;

      // 根据强度分配颜色：红色最热，橙色中等，主色调较弱
      let fillColor;
      if (intensity > 0.7) {
        fillColor = `rgba(239, 68, 68, ${intensity})`; // Rose 500 (红)
      } else if (intensity > 0.3) {
        fillColor = `rgba(245, 158, 11, ${intensity})`; // Amber 500 (橙)
      } else {
        fillColor = `rgba(20, 184, 166, ${intensity})`; // Teal 500 (主色调)
      }

      ctx.fillStyle = fillColor;
      // 绘制这个 1x1 的微小方块
      ctx.fillRect(x, y, 1, 1);
    }
  };

  return (
    <Card className="mt-5">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SectionTitle
            title="Radar Movement Heatmap"
            subtitle="Real historical spatial utilization rendered from raw grid data"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: `${MAIN_COLORS.aColor1}44`,
              backgroundColor: `${MAIN_COLORS.aColorWhite}b8`,
              color: MAIN_COLORS.aColorBlack,
            }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 画布容器，使用 CSS 将 105x105 的微小画布拉伸放大 */}
        <div 
          className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center"
          style={{ border: `1px solid ${MAIN_COLORS.aColor1}26` }}
        >
          {loading && (
             <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm text-sm font-medium" style={{ color: MAIN_COLORS.aColor1 }}>
               Rendering radar matrix...
             </div>
          )}
          
          {error ? (
            <div className="text-red-500 text-sm px-6 text-center">
               Failed to load radar matrix. Make sure the selected date has activity.<br/>
               <span className="text-xs opacity-70">Error: {error}</span>
            </div>
          ) : (
             <canvas 
               ref={canvasRef} 
               // 这里的 CSS 是关键：把 105px 的画布拉伸填满容器，并保持边缘柔和(像热力云)
               className="w-full h-full object-contain filter drop-shadow-md"
               style={{ imageRendering: "auto" }} // 允许浏览器做平滑插值
             />
          )}
        </div>
      </CardContent>
    </Card>
  );
}