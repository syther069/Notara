// One icon family (Iconoir), one stroke weight, sized in px like the rest of the UI.
// Pages import icons from here, never from iconoir-react directly, so the look stays consistent.
import type { ComponentType, SVGProps } from "react";
import * as I from "iconoir-react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number; strokeWidth?: number };

function icon(Svg: ComponentType<SVGProps<SVGSVGElement>>) {
  return function Icon({ size = 16, strokeWidth = 1.7, ...rest }: IconProps) {
    return <Svg width={size} height={size} strokeWidth={strokeWidth} {...rest} />;
  };
}

export const ArrowLeft = icon(I.ArrowLeft);
export const ArrowRight = icon(I.ArrowRight);
export const BadgeCheck = icon(I.BadgeCheck);
export const Bot = icon(I.Cpu);
export const Check = icon(I.Check);
export const ChevronDown = icon(I.NavArrowDown);
export const CircleAlert = icon(I.WarningCircle);
export const CircleCheck = icon(I.CheckCircle);
export const CircleX = icon(I.XmarkCircle);
export const CloudOff = icon(I.CloudXmark);
export const Coins = icon(I.Coins);
export const Copy = icon(I.Copy);
export const Download = icon(I.Download);
export const ExternalLink = icon(I.OpenNewWindow);
export const FileCode = icon(I.Code);
export const Flag = icon(I.TriangleFlag);
export const FlaskConical = icon(I.Flask);
export const Globe = icon(I.Globe);
export const Grid = icon(I.ViewGrid);
export const Info = icon(I.InfoCircle);
export const Link2 = icon(I.Link);
export const Lock = icon(I.Lock);
export const LogOut = icon(I.LogOut);
export const Menu = icon(I.Menu);
export const Moon = icon(I.HalfMoon);
export const Pause = icon(I.Pause);
export const Play = icon(I.Play);
export const Plus = icon(I.Plus);
export const QrCode = icon(I.QrCode);
export const Radio = icon(I.AntennaSignal);
export const RefreshCw = icon(I.Refresh);
export const Search = icon(I.Search);
export const Send = icon(I.Send);
export const Settings2 = icon(I.Settings);
export const ShieldAlert = icon(I.ShieldAlert);
export const ShieldCheck = icon(I.ShieldCheck);
export const ShieldX = icon(I.ShieldXmark);
export const Sun = icon(I.SunLight);
export const TriangleAlert = icon(I.WarningTriangle);
export const Wallet = icon(I.Wallet);
export const X = icon(I.Xmark);

/**
 * Orbit loading spinner (after loading.dev/spinners/orbit): two dots circling a quiet ring.
 * Use it only while real work is pending. Under reduced motion it stays still; the button's
 * label and aria-busy still say that work is pending.
 */
export function LoaderCircle({ size = 16, className = "" }: { size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <span className={`orbit ${className.replace(/\bspin\b/, "")}`} style={{ width: size, height: size }} aria-hidden>
      <span />
    </span>
  );
}
