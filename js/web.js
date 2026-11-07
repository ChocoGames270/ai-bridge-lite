/* AI Bridge Lite - Web: aportaciones + estado de disponibilidad + integración de onboarding */
(function () {
  "use strict";

  // 1. Sincronización inicial con el Onboarding
  if (window.AIBridgeOnboarding) {
    const onboarding = window.AIBridgeOnboarding;
    const cfg = onboarding.getConfig();

    console.log("[AI Bridge Lite]: Configuración cargada desde Onboarding.", {
      proveedor: cfg.proveedor_activo,
      idioma: cfg.idioma,
      areas: cfg.areas,
      tieneKey: onboarding.tieneApiKey()
    });

    if (!onboarding.isDone()) {
      console.warn("[AI Bridge Lite]: El onboarding está pendiente de completarse.");
    }
  }

  const MIN = 0;
  const MAX = 100;

  const MSG = {
    gratis: "El acceso gratuito está previsto. La versión Android todavía está en desarrollo y la descarga se habilitará cuando esté disponible.",
    pago: "Las aportaciones estarán disponibles próximamente, cuando se habilite el sistema de pagos."
  };

  const $ = (id) => document.getElementById(id);
  const input = $("pay-amount");
  const slider = $("pay-slider");
  const msg = $("pay-msg");
  const btn = $("btn-apk");
  const btnLabel = $("btn-apk-label");
  const chips = document.querySelectorAll(".chip[data-amount]");

  if (!input || !slider || !btn) return;

  const labelGratis = "Aplicación próximamente";

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

    // No hay APK ni pasarela de pago disponibles todavía.
    btn.href = "#descarga";
    btn.removeAttribute("download");
    btn.setAttribute("aria-disabled", "true");

    if (btnLabel) {
      btnLabel.textContent = n === 0
        ? labelGratis
        : "Aportaciones próximamente";
    }
  }

  // Impide cualquier intento de descarga o pago prematuro.
  btn.addEventListener("click", (event) => {
    event.preventDefault();
  });

  input.addEventListener("input", () =>
    actualizar(input.value, "input")
  );

  input.addEventListener("blur", () =>
    actualizar(input.value)
  );

  slider.addEventListener("input", () =>
    actualizar(slider.value, "slider")
  );

  chips.forEach((c) =>
    c.addEventListener("click", () =>
      actualizar(c.dataset.amount)
    )
  );

  actualizar(0);
})();
