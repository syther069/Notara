import { useEffect, useState } from "react";
import QR from "qrcode";

/** A scannable QR code for a link or address. Dark on light so every phone camera reads it. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QR.toDataURL(text, { margin: 2, width: 220, color: { dark: "#0F1F17", light: "#FFFFFF" } }).then(setSrc, () => setSrc(""));
  }, [text]);
  if (!src) return null;
  return <img src={src} alt={label} width={220} height={220} style={{ borderRadius: 8, display: "block" }} />;
}
