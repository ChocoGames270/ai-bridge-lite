/* AI Bridge Lite - Web: pago dinámico + descarga APK */
(function () {
  "use strict";

  const MIN = 0;
  const MAX = 100;
  const PAY_URL = "https://TU-PASARELA-DE-PAGO.com/checkout"; // reemplaza
  const APK_URL = "downloads/ai-bridge-lite.apk";              // reemplaza

  const MSG = {
  gratis: "¡Perfecto! Puedes comenzar con una contribución de $0. Descarga AI Bridge Lite y descubre todo lo que puedes crear.",
  pago: "¡Gracias por apoyar AI Bridge Lite! Tu contribución nos ayuda a mantener el proyecto, mejorar sus herramientas y desarrollar nuevas funciones."
};

  const $ = (id) => document.getElementById(id);
  const input = $("pay-amount");
  const slider = $("pay-slider");
  const msg = $("pay-msg");
  const btn = $("btn-apk");
  const chips = document.querySelectorAll(".chip[data-amount]");

  if (!input || !slider || !btn) return;

  function clamp(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return MIN;
    return Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
  }

  function actualizar(valor, origen) {
    const n = clamp(valor);
    if (origen !== "input") input.value = n;
    if (origen !== "slider") slider.value = n;

    chips.forEach((c) =>
      c.classList.toggle("active", parseFloat(c.dataset.amount) === n)
    );

    msg.textContent = n === 0 ? MSG.gratis : MSG.pago;
    btn.dataset.amount = n;

    if (n === 0) {
      btn.href = APK_URL;
      btn.setAttribute("download", "");
    } else {
      btn.href = PAY_URL + "?amount=" + encodeURIComponent(n) + "&currency=USD";
      btn.removeAttribute("download");
    }
  }

  input.addEventListener("input", () => actualizar(input.value, "input"));
  input.addEventListener("blur", () => actualizar(input.value));
  slider.addEventListener("input", () => actualizar(slider.value, "slider"));
  chips.forEach((c) =>
    c.addEventListener("click", () => actualizar(c.dataset.amount))
  );

  actualizar(0);
})();
