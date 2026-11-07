/* AI Bridge Lite - Web: aportaciones + estado + cliente de peticiones (BYOK) */
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

  if (input && slider && btn) {
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

      btn.href = "#descarga";
      btn.removeAttribute("download");
      btn.setAttribute("aria-disabled", "true");

      if (btnLabel) {
        btnLabel.textContent = n === 0
          ? labelGratis
          : "Aportaciones próximamente";
      }
    }

    btn.addEventListener("click", (event) => {
      event.preventDefault();
    });

    input.addEventListener("input", () => actualizar(input.value, "input"));
    input.addEventListener("blur", () => actualizar(input.value));
    slider.slider?.addEventListener?.("input", () => actualizar(slider.value, "slider"));
    slider.addEventListener("input", () => actualizar(slider.value, "slider"));

    chips.forEach((c) =>
      c.addEventListener("click", () => actualizar(c.dataset.amount))
    );

    actualizar(0);
  }

  // ==========================================
  // 2. CLIENTE DE PETICIONES HTTP DIRECTO (BYOK)
  // ==========================================
  const ENDPOINTS = {
    gemini: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    claude: "https://api.anthropic.com/v1/messages",
    openai: "https://api.openai.com/v1/chat/completions"
  };

  async function enviarPeticion(datosUsuario) {
    if (!window.AIBridgeOnboarding) {
      throw new Error("[AI Bridge Error]: El módulo de onboarding no está cargado.");
    }

    const onboarding = window.AIBridgeOnboarding;
    const payload = onboarding.buildPayload(datosUsuario);
    
    if (!payload) {
      throw new Error("[AI Bridge Error]: Payload inválido o falta una API Key válida (mínimo 10 caracteres).");
    }

    const proveedor = payload.proveedor;
    const apiKey = payload.api_key_usuario;
    let url = ENDPOINTS[proveedor];
    let headers = { "Content-Type": "application/json" };
    let bodyData = null;

    if (proveedor === "gemini") {
      url = `${url}?key=${apiKey}`;
      bodyData = {
        contents: [{ parts: [{ text: `${payload.prompt_intencion}\n\n${payload.script_snippet || ""}` }] }]
      };
    } else if (proveedor === "claude") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
      bodyData = {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [{ role: "user", content: `${payload.prompt_intencion}\n\n${payload.script_snippet || ""}` }]
      };
    } else if (proveedor === "openai") {
      headers["Authorization"] = `Bearer ${apiKey}`;
      bodyData = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `${payload.prompt_intencion}\n\n${payload.script_snippet || ""}` }],
        max_tokens: 1500
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[API Error ${response.status}]: ${errorText}`);
      }

      const resultadoJson = await response.json();
      return parsearRespuesta(proveedor, resultadoJson);

    } catch (error) {
      console.error("[AI Bridge Fetch Error]:", error);
      throw error;
    }
  }

  function parsearRespuesta(proveedor, data) {
    if (proveedor === "gemini") {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta legible de Gemini.";
    } else if (proveedor === "claude") {
      return data.content?.[0]?.text || "Sin respuesta legible de Claude.";
    } else if (proveedor === "openai") {
      return data.choices?.[0]?.message?.content || "Sin respuesta legible de OpenAI.";
    }
    return JSON.stringify(data);
  }

  // Exponemos el cliente globalmente por si lo llamas desde la interfaz
  global.AIBridgeClient = {
    enviarPeticion
  };

})(window);
