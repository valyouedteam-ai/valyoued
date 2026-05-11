import { useState, useEffect } from "react";

export function useProTier() {
  const [isPro, setIsPro] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("valyoued.pro") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("valyoued.pro", isPro.toString());
  }, [isPro]);

  return { isPro, setIsPro };
}
