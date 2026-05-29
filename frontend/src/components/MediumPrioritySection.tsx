"use client";

export default function MediumPrioritySection({ threatCount = 0, onActionComplete = () => {} }: { threatCount?: number; onActionComplete?: () => void }) {
  return (
    <div style={{ background: "red", color: "white", padding: "40px", margin: "20px 0", borderRadius: "12px", fontSize: "24px", fontWeight: "bold" }}>
      ✅ MEDIUM-Priority Components Integrated (threatCount={threatCount})
    </div>
  );
}
