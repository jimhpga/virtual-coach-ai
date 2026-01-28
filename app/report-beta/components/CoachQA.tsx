"use client";

export default function CoachQA(props: {
  coachQuestion: string;
  setCoachQuestion: (v: string) => void;
  coachAnswer: string;
  isAsking: boolean;
  onAsk: () => void;
}) {
  const { coachQuestion, setCoachQuestion, coachAnswer, isAsking, onAsk } = props;

  // NOTE: We intentionally do NOT import Collapsible here.
  // We keep the Collapsible wrapper in the parent so we don't have to chase relative imports.
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>Question</div>
          <input
            value={coachQuestion}
            onChange={(e) => setCoachQuestion(e.target.value)}
            placeholder='e.g., "What is my right elbow doing?"'
            style={{
              width: "100%",
              height: 42,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)",
              color: "#e6edf6",
              padding: "0 12px",
              outline: "none",
            }}
          />
        </div>
        <button
          type="button"
          onClick={onAsk}
          disabled={isAsking || !coachQuestion.trim()}
          style={{
            height: 42,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: isAsking ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.12)",
            color: "#e6edf6",
            padding: "0 14px",
            cursor: isAsking ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
          title={isAsking ? "Thinking…" : "Ask"}
        >
          {isAsking ? "Asking…" : "Ask"}
        </button>
      </div>

      {coachAnswer ? (
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
            padding: 12,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8, marginBottom: 6 }}>Coach</div>
          {coachAnswer}
        </div>
      ) : null}
    </div>
  );
}
