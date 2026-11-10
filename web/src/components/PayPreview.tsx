import { CircleCheck, CircleX, Clock, Lock } from "./icons";

export type PreviewCheck = { state: "ok" | "wait" | "bad"; text: string };

/**
 * Notara's own customer page (a pay page or a claim page), drawn live from what the user is typing.
 * It is the product's real layout, not a picture of it; every word in it comes from the form or from
 * what Notara will check, never invented.
 */
export function PayPreview({
  path,
  forText,
  emptyFor,
  amount,
  to,
  checks,
  primary,
  secondary,
}: {
  path: string;
  forText: string;
  emptyFor: string;
  amount: string;
  to?: React.ReactNode;
  checks: PreviewCheck[];
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="pv" role="img" aria-label={`Preview of the page your link opens: ${forText || emptyFor}, ${amount}`}>
      <div className="pv__bar" aria-hidden>
        <Lock size={13} />
        <span className="mono">
          {location.host}
          {path}
        </span>
        <span className="example-tag">Preview</span>
      </div>
      <div className="pv__body" aria-hidden>
        <div className={`pv__for${forText ? "" : " is-empty"}`}>{forText || emptyFor}</div>
        <div className="pv__amount num">{amount}</div>
        {to && <div className="pv__to">{to}</div>}
        <ul className="pv__checks">
          {checks.map((c) => (
            <li key={c.text} className={c.state}>
              {c.state === "ok" ? <CircleCheck size={16} /> : c.state === "bad" ? <CircleX size={16} /> : <Clock size={16} />} {c.text}
            </li>
          ))}
        </ul>
        <div className="pv__acts">
          <span className="pv__fake pv__fake--primary">{primary}</span>
          {secondary && <span className="pv__fake">{secondary}</span>}
        </div>
      </div>
    </div>
  );
}
