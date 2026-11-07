/* AI Bridge Lite - Web: Lógica de Aportaciones ($0 a $100), Enlace APK y Consola BYOK */
(function (global) {
  "use strict";

  // 1. Sincronización inicial con el Onboarding
  if (window.AIBridgeOnboarding) {
    const onboarding = window.AIBridgeOnboarding;
    const cfg = onboarding.getConfig();

    console.log("[AI Bridge Lite]: Configuración cargada.", {
      proveedor: cfg.proveedor_activo,
      tieneKey: onboarding.tieneApiKey()
    });
  }

  // 2. Control Lógico del Slider ($0 a $100) y Botón de Acción
  const MIN = 0;
  const MAX = 100;

  const MENSAJES = {
    gratis: "Modo Gratuito activo (BYOK). Para usar la consola o descargar la APK en este modo, requerirás tu propia API Key.",
    pago: "¡Gracias por apoyar el proyecto! Las aportaciones de dinero real y pasarela de pago directa se habilitarán en la versión 1.0."
  };

  const $ = (id) => document.getElementById(id);
  const input = $("pay-amount");
  const slider = $("pay-slider");
  const msg = $("pay-msg");
  const btn = $("btn-apk");
  const btnLabel = $("btn-apk-label");
  const chips = document.querySelectorAll(".chip[data-amount]");

  if (input && slider && btn) {
    function clamp(v) {
      const n = parseFloat(v);
      if (isNaN(n)) return MIN;
      return Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
    }

    function actualizarFlujo(valor, origen) {
      const monto = clamp(valor);

      if (origen !== "input") input.value = monto;
      if (origen !== "slider") slider.value = monto;

      chips.forEach((c) =>
        c.classList.toggle("active", parseFloat(c.dataset.amount) === monto)
      );

      btn.dataset.amount = monto;

      if (monto === 0) {
        // Opción $0: BYOK y descarga gratuita
        msg.textContent = MENSAJES.gratis;
        btn.className = "btn-primary"; // Cambia estilo a activo
        if (btnLabel) btnLabel.textContent = "DESCARGAR APK (GRATIS - BYOK)";
        btn.href = "#panel-chat"; // Redirige a probar la consola
      } else {
        // Opción > $0: Aporte
        msg.textContent = MENSAJES.pago;
        btn.className = "btn-disabled";
        if (btnLabel) btnLabel.textContent = `APORTAR $${monto} (PRÓXIMAMENTE)`;
        btn.href = "#descarga";
      }
    }

    btn.addEventListener("click", (event) => {
      const monto = parseFloat(btn.dataset.amount || "0");
      if (monto === 0) {
        // Comprobar si el usuario tiene su API Key antes de enviarlo a la consola
        if (window.AIBridgeOnboarding && !window.AIBridgeOnboarding.tieneApiKey()) {
          alert("Recuerda que en la opción gratuita ($0) necesitas ingresar tu API Key en la consola para realizar peticiones.");
        }
      } else {
        event.preventDefault();
      }
    });

    input.addEventListener("input", () => actualizarFlujo(input.value, "input"));
    input.addEventListener("blur", () => actualizarFlujo(input.value));
    slider.addEventListener("input", () => actualizarFlujo(slider.value, "slider"));

    chips.forEach((c) =>
      c.addEventListener("click", () => actualizarFlujo(c.dataset.amount))
    );

    // Inicializar en $0
    actualizarFlujo(0);
  }

  // 3. Cliente HTTP Directo para Peticiones (BYOK)
  const ENDPOINTS = {
    gemini: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    claude: "https://api.anthropic.com/v1/messages",
    openai: "https://api.openai.com/v1/chat/completions"
  };

  async function enviarPeticion(datosUsuario) {
    if (!window.AIBridgeOnboarding) {
      throw new Error("[AI Bridge Error]: Módulo de onboarding no encontrado.");
    }

    const onboarding = window.AIBridgeOnboarding;
    const payload = onboarding.buildPayload(datosUsuario);
    
    if (!payload || !payload.api_key_usuario) {
      throw new Error("Falta tu API Key. Ingresa una clave válida para realizar la consulta en modo $0.");
    }

    const proveedor = payload.proveedor;
    const apiKey = payload.api_key_usuario;
    let url = ENDPOINTS[proveedor];
    let headers = { "Content-Type": "application/json" };
    let bodyData = null;

    if (proveedor === "gemini") {
      url = `${url}?key=${apiKey}`;
      bodyData = {
        contents: [{ parts: [{ text: payload.prompt_intencion }] }]
      };
    } else if (proveedor === "claude") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
      bodyData = {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [{ role: "user", content: payload.prompt_intencion }]
      };
    } else if (proveedor === "openai") {
      headers["Authorization"] = `Bearer ${apiKey}`;
      bodyData = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: payload.prompt_intencion }],
        max_tokens: 1500
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[API Error ${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    return parsearRespuesta(proveedor, data);
  }

  function parsearRespuesta(proveedor, data) {
    if (proveedor === "gemini") {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta de Gemini.";
    } else if (proveedor === "claude") {
      return data.content?.[0]?.text || "Sin respuesta de Claude.";
    } else if (proveedor === "openai") {
      return data.choices?.[0]?.message?.content || "Sin respuesta de OpenAI.";
    }
    return JSON.stringify(data);
  }

  global.AIBridgeClient = { enviarPeticion };

  // 4. Conexión con el Botón "Enviar a la IA" de la Consola
  const btnEnviar = $("btn-enviar-ai");
  const txtPrompt = $("user-prompt");
  const boxOutput = $("ai-output");

  if (btnEnviar && txtPrompt && boxOutput) {
    btnEnviar.addEventListener("click", async () => {
      const intencion = txtPrompt.value.trim();

      if (!intencion) {
        boxOutput.textContent = "Escribe una consulta antes de enviar.";
        return;
      }

      boxOutput.textContent = "Procesando petición en vivo con la IA...";
      btnEnviar.disabled = true;

      try {
        const respuesta = await global.AIBridgeClient.enviarPeticion({
          prompt_intencion: intencion
        });
        boxOutput.textContent = respuesta;
      } catch (error) {
        boxOutput.textContent = `Error: ${error.message}`;
      } finally {
        btnEnviar.disabled = false;
      }
    });
  }

})(window);
