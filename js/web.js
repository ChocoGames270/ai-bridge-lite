/* AI Bridge Lite - Landing (Repo 1): Aportaciones ($0 a $100) + Instalación PWA */
(function (global) {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const MIN = 0;
  const MAX = 100;

  const MENSAJES = {
    // Textos de ChatGPT
    gratis: "¡Perfecto! Puedes comenzar con una contribución de $0. Descarga AI Bridge Lite y descubre todo lo que puedes crear.",
    pago: "¡Gracias por apoyar AI Bridge Lite! Tu contribución nos ayuda a mantener el proyecto, mejorar sus herramientas y desarrollar nuevas funciones.",
    // Avisos funcionales de la instalación
    pagoClick: "Las aportaciones de pago estarán disponibles próximamente.",
    yaInstalada: "Ya estás usando la app instalada.",
    instalando: "¡Listo! Instalando la app en tu dispositivo...",
    cancelada: "Instalación cancelada. Puedes intentarlo de nuevo cuando quieras.",
    ios: "En iPhone/iPad: abre esta página en Safari, toca Compartir y elige «Añadir a pantalla de inicio».",
    manual: "Abre el menú ⋮ de Chrome y toca «Instalar aplicación» (o «Añadir a la pantalla de inicio»). Si no aparece, recarga la página una vez."
  };

  const ETIQUETA_GRATIS = "Descargar AI Bridge Lite — Gratis";

  const input = $("pay-amount");
  const slider = $("pay-slider");
  const msg = $("pay-msg");
  const btn = $("btn-apk");
  const btnLabel = $("btn-apk-label");
  const chips = document.querySelectorAll(".chip[data-amount]");

  if (!input || !slider || !btn) return;

  const setMsg = (t) => { if (msg) msg.textContent = t; };

  const esStandalone = () =>
    (global.matchMedia && global.matchMedia("(display-mode: standalone)").matches) ||
    global.navigator.standalone === true;

  const esIOS = () => /iphone|ipad|ipod/i.test(global.navigator.userAgent);

  async function instalarApp() {
    if (esStandalone()) { setMsg(MENSAJES.yaInstalada); return; }

    const ev = global.__pwaInstall; // capturado en el <head> de index.html
    if (ev) {
      try {
        await ev.prompt();
        const r = await ev.userChoice;
        global.__pwaInstall = null; // el evento solo se puede usar una vez
        setMsg(r && r.outcome === "accepted" ? MENSAJES.instalando : MENSAJES.cancelada);
      } catch (_) {
        setMsg(MENSAJES.manual);
      }
      return;
    }
    setMsg(esIOS() ? MENSAJES.ios : MENSAJES.manual);
  }

  const clamp = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return MIN;
    return Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
  };

  const actualizarFlujo = (valor, origen) => {
    const monto = clamp(valor);

    if (origen !== "input") input.value = monto;
    if (origen !== "slider") slider.value = monto;

    chips.forEach((c) =>
      c.classList.toggle("active", parseFloat(c.dataset.amount) === monto)
    );

    btn.dataset.amount = monto;

    // El href nunca cambia (siempre "#" con preventDefault): sin saltos de página.
    if (monto === 0) {
      setMsg(MENSAJES.gratis);
      btn.className = "btn-primary";
      btn.removeAttribute("aria-disabled");
      if (btnLabel) btnLabel.textContent = esStandalone() ? "APP INSTALADA ✔" : ETIQUETA_GRATIS;
    } else {
      setMsg(MENSAJES.pago);
      btn.className = "btn-disabled";
      btn.setAttribute("aria-disabled", "true");
      if (btnLabel) btnLabel.textContent = `APORTAR $${monto} (PRÓXIMAMENTE)`;
    }
  };

  btn.addEventListener("click", (event) => {
    event.preventDefault(); // siempre: evita el salto al "#"
    const monto = parseFloat(btn.dataset.amount || "0");
    if (monto !== 0) {
      setMsg(MENSAJES.pagoClick);
      return;
    }
    instalarApp();
  });

  input.addEventListener("input", () => actualizarFlujo(input.value, "input"));
  input.addEventListener("blur", () => actualizarFlujo(input.value));
  slider.addEventListener("input", () => actualizarFlujo(slider.value, "slider"));
  chips.forEach((c) =>
    c.addEventListener("click", () => actualizarFlujo(c.dataset.amount))
  );

  global.addEventListener("pwa-installed", () => {
    actualizarFlujo(btn.dataset.amount || 0);
    setMsg(MENSAJES.instalando);
  });

  actualizarFlujo(0);

})(window);
