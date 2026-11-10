// Runs the design-taste-frontend kit (web/public/kit, MIT) inside the React app: the motion layer
// (hover, press, the hero's entrance), the dealt moments and the one effect. The kit is plain ES modules
// made for static pages, so they're loaded from /kit at runtime and told about each page React renders.
//
// One deviation from the kit: it mounts effects from its own system.js, which is written for its
// starter page and would take over Notara's nav, forms and buttons. Here that one call (fx.mount on
// [data-fx]) is made by this loader instead; everything else is the kit's own code, unchanged.

type Motion = { refresh: () => void };
type Moments = { mount: (el: Element) => Promise<unknown>; mountAll: (root?: ParentNode) => void; unmountAll: (root?: ParentNode) => void };
type Fx = { mount: (el: Element, id: string, opts?: { seed?: number }) => Promise<unknown> };

const url = (p: string) => new URL(`/kit/${p}`, location.origin).href;
let motion: Promise<Motion> | null = null;
let moments: Promise<Moments> | null = null;
let fx: Promise<Fx> | null = null;
const load = <T,>(p: string) => import(/* @vite-ignore */ url(p)) as Promise<T>;

/**
 * The kit's own rule: a card lifts on hover only when it is a link ("a card without a link: nothing,
 * .m-nolift"). Notara uses .card for forms and panels too, so every card that isn't a link gets it.
 */
function markUnlinkedCards(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".card").forEach((c) => {
    if (c.tagName !== "A") c.classList.add("m-nolift");
  });
}

/**
 * Call after a page has rendered. `fresh` (a route change) first unmounts the last page's moments; a later
 * call only mounts moments not mounted yet, so a figure that already rolled is never rebuilt.
 * Safe to call often; failures leave the page as written.
 */
export async function kitRefresh(root: HTMLElement, fresh = true) {
  markUnlinkedCards(root);
  try {
    motion ??= load<Motion>("motion/motion.js");
    (await motion).refresh();
  } catch (e) {
    console.warn("kit: motion layer didn't load", e);
  }
  try {
    moments ??= load<Moments>("moments/moments.js");
    const m = await moments;
    if (fresh) m.unmountAll(document);
    root.querySelectorAll<HTMLElement>("[data-moment]:not([data-moment-mounted])").forEach((el) => void m.mount(el).catch(() => {}));
  } catch (e) {
    console.warn("kit: moments didn't load", e);
  }
  const grounds = [...root.querySelectorAll<HTMLElement>("[data-fx]")].filter((el) => !el.hasAttribute("data-fx-mounted"));
  if (!grounds.length) return;
  try {
    fx ??= load<Fx>("effects/fx.js");
    const f = await fx;
    for (const el of grounds) {
      el.setAttribute("data-fx-mounted", "");
      await f.mount(el, el.dataset.fx!, { seed: el.dataset.fxSeed ? Number(el.dataset.fxSeed) : undefined });
    }
  } catch (e) {
    console.warn("kit: effect didn't load; the frame keeps its still ground", e);
  }
}

/**
 * For a moment on figures that arrive after the page renders (the dashboard's live totals): render the host
 * without data-moment until the figures are final, give it a React key made of them (a new figure is a new
 * host, never one rebuilt in place), and pass this as its ref.
 */
export function mountMoment(el: HTMLElement | null) {
  if (!el || el.hasAttribute("data-moment-mounted")) return;
  moments ??= load<Moments>("moments/moments.js");
  moments.then((m) => m.mount(el)).catch(() => {});
}
