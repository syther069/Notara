// "Pay with Notara" button for any website. Paste where the button should appear:
//   <script src="https://YOUR-NOTARA-HOST/embed.js" data-link="INV-0005"></script>
// It only adds a link to the Notara payment page; no data leaves the merchant's site.
(function () {
  var s = document.currentScript;
  if (!s) return;
  var id = s.getAttribute("data-link") || "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return;
  var a = document.createElement("a");
  a.href = new URL("/pay/" + id, s.src).href;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = s.getAttribute("data-label") || "Pay with Notara";
  a.style.cssText =
    "display:inline-block;padding:12px 20px;border-radius:10px;background:#B8D26A;color:#0F1F17;" +
    "font:600 15px/1.2 system-ui,sans-serif;text-decoration:none;border:1px solid #0F1F17";
  s.parentNode.insertBefore(a, s.nextSibling);
})();
