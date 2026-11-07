
/* AI Bridge Lite - Onboarding (LocalStorage) */
(function (global) {
  "use strict";

  const KEY = "aibl_config_v1";
  const IDIOMAS = ["es", "en", "pt"];
  const AREAS = ["scripts", "3d", "vfx", "aprendiz"];
  const PROVEEDORES = ["gemini", "claude", "openai"];
  const PASOS = ["idioma", "areas", "api_keys"];

  const DEFAULT = {
    version: "1.0",
    completado: false,
    idioma: "es",
    areas: [],
    api_keys: {
      gemini: "",
      claude: "",
      openai: ""
    },
    proveedor_activo: "gemini"
  };

  let cfg = load();
  let paso = 0;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);

      const data = JSON.parse(raw);

      return Object.assign(clone(DEFAULT), data, {
        api_keys: Object.assign(
          {},
          DEFAULT.api_keys,
          data.api_keys || {}
        )
      });
    } catch (e) {
      return clone(DEFAULT);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function tieneApiKey() {
    return PROVEEDORES.some(
      p => String(cfg.api_keys[p] || "").trim().length >= 10
    );
  }

  function validarPaso(i) {
    switch (PASOS[i]) {
      case "idioma":
        return IDIOMAS.includes(cfg.idioma);

      case "areas":
        return Array.isArray(cfg.areas) && cfg.areas.length > 0;

      case "api_keys":
        // La API Key es opcional: el usuario puede continuar sin ella.
        return true;

      default:
        return false;
    }
  }

  const API = {
    pasos: PASOS,

    pasoActual: () => PASOS[paso],

    indice: () => paso,

    isDone: () => cfg.completado === true,

    getConfig: () => clone(cfg),

    tieneApiKey: () => tieneApiKey(),

    setIdioma(id) {
      if (!IDIOMAS.includes(id)) return false;
      cfg.idioma = id;
      return save();
    },

    toggleArea(area) {
      if (!AREAS.includes(area)) return false;

      const i = cfg.areas.indexOf(area);

      if (i === -1) {
        cfg.areas.push(area);
      } else {
        cfg.areas.splice(i, 1);
      }

      return save();
    },

    setKey(proveedor, valor) {
      if (!PROVEEDORES.includes(proveedor)) return false;

      cfg.api_keys[proveedor] = String(valor || "").trim();

      const activa = cfg.api_keys[cfg.proveedor_activo];

      if (!activa) {
        const alt = PROVEEDORES.find(p => cfg.api_keys[p]);

        if (alt) {
          cfg.proveedor_activo = alt;
        }
      }

      return save();
    },

    setProveedorActivo(p) {
      if (!PROVEEDORES.includes(p)) return false;

      cfg.proveedor_activo = p;
      return save();
    },

    next() {
      if (!validarPaso(paso)) {
        return {
          ok: false,
          error: "paso_invalido"
        };
      }

      if (paso < PASOS.length - 1) {
        paso++;

        return {
          ok: true,
          paso: PASOS[paso]
        };
      }

      cfg.completado = true;
      save();

      return {
        ok: true,
        fin: true
      };
    },

    back() {
      if (paso > 0) paso--;
      return PASOS[paso];
    },

    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}

      cfg = clone(DEFAULT);
      paso = 0;
    },

    buildPayload(datos) {
      const key = cfg.api_keys[cfg.proveedor_activo];

      // Sin clave no se genera un payload BYOK.
      // El modo de servicio propio deberá gestionarse por separado.
      if (!key || key.length < 10) return null;

      const p = {
        version: "1.0",
        proveedor: cfg.proveedor_activo,
        perfil_seleccionado: datos.perfil_seleccionado,
        prompt_intencion: String(
          datos.prompt_intencion || ""
        ).slice(0, 1000),
        api_key_usuario: key
      };

      if (datos.script_snippet) {
        p.script_snippet = String(
          datos.script_snippet
        ).slice(0, 6000);
      }

      if (datos.objeto_properties) {
        p.objeto_properties = datos.objeto_properties;
      }

      if (
        Array.isArray(datos.modo_secuencia_frames) &&
        datos.modo_secuencia_frames.length
      ) {
        p.modo_secuencia_frames =
          datos.modo_secuencia_frames.slice(0, 5);
      }

      return p;
    }
  };

  global.AIBridgeOnboarding = API;

})(window);
