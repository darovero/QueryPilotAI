"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="animate-pulse flex items-center gap-3">
        <span className="material-symbols-outlined animate-spin text-[24px]">hourglass_empty</span>
        Loading your workspace...
      </div>
    </div>
  );
}
