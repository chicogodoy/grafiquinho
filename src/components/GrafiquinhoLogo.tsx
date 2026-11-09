import React from "react";

interface GrafiquinhoLogoProps {
  className?: string;
  size?: number;
  variant?: "badge" | "mark";
  accentColor?: string;
}

/**
 * Ícone minimalista do Grafiquinho:
 * Representa em 3 traços essenciais o objetivo do projeto:
 * 1. Curva ascendente suave (série de dados + área sombreada)
 * 2. Ponto focal destacado no pico (destaque pontual customizado)
 * 3. Estrela de 4 pontas (insight / print visual pronto para relatório)
 */
export default function GrafiquinhoLogo({
  className = "",
  size = 36,
  variant = "badge",
  accentColor = "#fbbf24",
}: GrafiquinhoLogoProps) {
  if (variant === "mark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M3.5 20.5 C7.5 20.5, 9.5 13.5, 13.5 15 C17 16.2, 19 7.5, 23 7.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="23"
          cy="7.5"
          r="4.5"
          fill={accentColor}
          fillOpacity="0.28"
        />
        <circle
          cx="23"
          cy="7.5"
          r="2.8"
          fill={accentColor}
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9.5 4.5 L10.3 6.7 L12.5 7.5 L10.3 8.3 L9.5 10.5 L8.7 8.3 L6.5 7.5 L8.7 6.7 Z"
          fill={accentColor}
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id="grafiquinho-bg-grad"
          x1="0"
          y1="0"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient
          id="grafiquinho-area-grad"
          x1="18"
          y1="10"
          x2="18"
          y2="29"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill="url(#grafiquinho-bg-grad)" />
      <path
        d="M7 25 C11 25, 13 18, 17 19.5 C20.5 20.8, 22.5 11.5, 26.5 11.5 L26.5 28 L7 28 Z"
        fill="url(#grafiquinho-area-grad)"
      />
      <path
        d="M7 25 C11 25, 13 18, 17 19.5 C20.5 20.8, 22.5 11.5, 26.5 11.5"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.5" cy="11.5" r="5.5" fill={accentColor} fillOpacity="0.32" />
      <circle
        cx="26.5"
        cy="11.5"
        r="3.2"
        fill={accentColor}
        stroke="#ffffff"
        strokeWidth="1.6"
      />
      <path
        d="M12.5 8 L13.4 10.6 L16 11.5 L13.4 12.4 L12.5 15 L11.6 12.4 L9 11.5 L11.6 10.6 Z"
        fill={accentColor}
      />
    </svg>
  );
}

