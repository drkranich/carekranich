import { useEffect, useState } from "react";

export function useGreeting(name?: string | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const part =
    h < 5 ? "Good night" :
    h < 12 ? "Good morning" :
    h < 18 ? "Good afternoon" :
    h < 22 ? "Good evening" : "Good night";
  const first = (name ?? "").trim().split(" ")[0] || "";
  return { greeting: first ? `${part}, ${first}` : part, now, hour: h };
}
