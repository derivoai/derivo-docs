"use client";

import React, { useEffect, useState } from "react";
import {
  Shader,
  Swirl,
  ChromaFlow,
  FlutedGlass,
  FilmGrain,
} from "shaders/react";

export function HeroShaderBackground() {
  const [mounted, setMounted] = useState(false);
  const [shaderUnavailable, setShaderUnavailable] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Subtle warm radial fallback behind or when WebGPU is unavailable */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle at 72% 38%, rgba(255, 95, 3, 0.22) 0%, rgba(255, 130, 50, 0.08) 38%, rgba(239, 239, 239, 0) 70%)",
          opacity: shaderUnavailable || !mounted ? 1 : 0.35,
        }}
      />

      {mounted && !shaderUnavailable && (
        <Shader
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
          onUnavailable={() => setShaderUnavailable(true)}
        >
          <Swirl colorA="#ffffff" colorB="#f0f0f0" detail={1.7} />
          <ChromaFlow
            baseColor="#ffffff"
            downColor="#ff5f03"
            leftColor="#ff5f03"
            rightColor="#ff5f03"
            upColor="#ff5f03"
            momentum={13}
            radius={3.5}
          />
          <FlutedGlass
            aberration={0.61}
            angle={31}
            frequency={8}
            highlight={0.12}
            highlightSoftness={0}
            lightAngle={-90}
            refraction={4}
            shape="rounded"
            softness={1}
            speed={0.15}
          />
          <FilmGrain strength={0.05} />
        </Shader>
      )}
    </div>
  );
}
