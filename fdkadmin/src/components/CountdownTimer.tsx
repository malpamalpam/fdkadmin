"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  deadline: string;
  closedAt?: string | null; // if set, timer is frozen
}

export function CountdownTimer({ deadline, closedAt }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [colorClass, setColorClass] = useState("text-green-600");

  useEffect(() => {
    const dl = new Date(deadline).getTime();

    // If closed, show frozen result
    if (closedAt) {
      const closed = new Date(closedAt).getTime();
      const diff = dl - closed;
      if (diff <= 0) {
        const overMs = Math.abs(diff);
        const overMin = Math.floor(overMs / 60000);
        const overH = Math.floor(overMin / 60);
        const m = overMin % 60;
        setTimeLeft(`⚠ po terminie o ${overH > 0 ? `${overH}h ` : ""}${m}min`);
        setColorClass("text-red-600 font-bold");
      } else {
        setTimeLeft("w terminie");
        setColorClass("text-green-600");
      }
      return; // no interval needed
    }

    function update() {
      const now = new Date().getTime();
      const diff = dl - now;

      if (diff <= 0) {
        const overMs = Math.abs(diff);
        const overMin = Math.floor(overMs / 60000);
        const overH = Math.floor(overMin / 60);
        const m = overMin % 60;
        setTimeLeft(`-${overH > 0 ? `${overH}h ` : ""}${m}min`);
        setColorClass("text-red-600 font-bold animate-pulse");
      } else {
        const totalMin = Math.floor(diff / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h > 0 ? `${h}h ` : ""}${m}min ${s}s`);
        setColorClass(
          totalMin < 30
            ? "text-yellow-600 font-semibold"
            : "text-green-600"
        );
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline, closedAt]);

  return <span className={colorClass}>{timeLeft}</span>;
}
