import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { signaling } from "../services/signaling";
import { guessDeviceType } from "../types/device";

export default function JoinLink() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const type = guessDeviceType();
    signaling
      .connect(roomCode, "", type)
      .then(() => navigate(`/room/${roomCode}`, { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not connect."));
  }, [roomCode, navigate]);

  return (
    <div className="screen" style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 16 }}>
      <p className="eyebrow">GESTURA</p>
      <h1 className="title-gradient">
        Joining <span className="accent">room {roomCode}</span>...
      </h1>
      {error ? (
        <>
          <p className="error-text">{error}</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Back to start
          </button>
        </>
      ) : (
        <p style={{ color: "var(--color-text-muted)" }}>Connecting...</p>
      )}
    </div>
  );
}
