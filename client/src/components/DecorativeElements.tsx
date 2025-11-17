export function FloatingFlowers() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <div className="absolute top-10 right-10 text-4xl animate-float">🌸</div>
      <div className="absolute top-32 left-16 text-3xl animate-float-delayed">🌼</div>
      <div className="absolute bottom-20 right-24 text-3xl animate-float-slow">💐</div>
    </div>
  );
}

export function WaveDecoration({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute bottom-0 left-0 right-0 ${className}`}>
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
        <path
          d="M0,50 C150,80 350,0 600,50 C850,100 1050,20 1200,50 L1200,120 L0,120 Z"
          className="fill-secondary/10"
        />
        <path
          d="M0,70 C300,100 500,40 800,70 C1000,90 1100,60 1200,80 L1200,120 L0,120 Z"
          className="fill-accent/10"
        />
      </svg>
    </div>
  );
}

export function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
      />
      <path
        d="M19 3L19.5 5L21.5 5.5L19.5 6L19 8L18.5 6L16.5 5.5L18.5 5L19 3Z"
        fill="currentColor"
      />
      <path
        d="M19 16L19.5 18L21.5 18.5L19.5 19L19 21L18.5 19L16.5 18.5L18.5 18L19 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
