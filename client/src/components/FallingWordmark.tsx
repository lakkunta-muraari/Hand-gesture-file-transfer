import { useMemo } from "react";

interface Props {
  word: string;
  /** Called once the last letter has finished landing. */
  onDone?: () => void;
}

/**
 * Renders `word` as individual letters that fall from above the
 * viewport and land in sequence, left to right, like they're
 * dropping into place and colliding to form the word. Pure CSS
 * (staggered animation-delay per letter) — no animation library
 * needed. Tuned to finish well under 3 seconds total.
 */
export default function FallingWordmark({ word, onDone }: Props) {
  const letters = useMemo(() => word.split(""), [word]);

  // Each letter starts falling `STAGGER_MS` after the previous one,
  // and each fall takes `FALL_MS`. Total runtime = stagger*(n-1) + fall.
  const STAGGER_MS = 90;
  const FALL_MS = 550;
  const totalMs = STAGGER_MS * (letters.length - 1) + FALL_MS;

  return (
    <h1
      className="falling-wordmark"
      aria-label={word}
      onAnimationEnd={(e) => {
        // Only fire once, when the LAST letter's animation finishes.
        if (e.target === e.currentTarget.lastElementChild) onDone?.();
      }}
      style={{ ["--total-ms" as string]: `${totalMs}ms` }}
    >
      {letters.map((letter, i) => (
        <span
          key={i}
          className="falling-letter"
          style={{ animationDelay: `${i * STAGGER_MS}ms` }}
        >
          {letter}
        </span>
      ))}
    </h1>
  );
}
