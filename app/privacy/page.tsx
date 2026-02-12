"use client";

import React from "react";

export default function PrivacyPage() {
  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    soft: "rgba(255,255,255,0.06)",
    link: "rgba(255,255,255,0.92)",
    chip: "rgba(255,255,255,0.08)",
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ margin: "18px 0 8px", fontSize: 16, fontWeight: 900 }}>
      {children}
    </h2>
  );

  const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ margin: "10px 0", color: C.muted }}>{children}</p>
  );

  const Li = ({ children }: { children: React.ReactNode }) => (
    <li style={{ margin: "8px 0", color: C.muted }}>{children}</li>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: C.bg,
        color: C.text,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 960,
          maxWidth: "96vw",
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          background: C.panel,
          padding: 24,
        }}
      >
        <header style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                background: C.chip,
                border: `1px solid ${C.border}`,
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                color: C.muted,
              }}
            >
              Auriona
            </span>
            <span
              style={{
                background: C.chip,
                border: `1px solid ${C.border}`,
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                color: C.muted,
              }}
            >
              Política de Privacidad
            </span>
            <span
              style={{
                background: C.chip,
                border: `1px solid ${C.border}`,
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                color: C.muted,
              }}
            >
              Última actualización: [01-03-2026]
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Política de Privacidad
          </h1>

          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
            Esta Política explica qué datos personales tratamos, con qué fines, por cuánto tiempo,
            cómo los protegemos y qué derechos tenés. En el login, Auriona solicita aceptación de
            esta Política y de los Términos, confirmación de mayoría de edad (+18) y, de forma
            opcional, consentimiento para usar ubicación.
          </div>
        </header>

        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 16,
            background: "transparent",
            maxHeight: "72vh",
            overflow: "auto",
            lineHeight: 1.6,
            fontSize: 14,
          }}
        >
          <SectionTitle>1) Responsable del tratamiento</SectionTitle>
          <P>
            Responsable/Titular: <b style={{ color: C.text }}>[RAZÓN SOCIAL / NOMBRE LEGAL]</b>.{" "}
            <br />
            Domicilio: <b style={{ color: C.text }}>[DOMICILIO LEGAL]</b>. <br />
            Email de contacto: <b style={{ color: C.text }}>[EMAIL DE CONTACTO]</b>. <br />
            Email legal/privacidad:{" "}
            <b style={{ color: C.text }}>[EMAIL LEGAL/PRIVACIDAD]</b>.
          </P>

          <SectionTitle>2) Alcance</SectionTitle>
          <P>
            Esta Política se aplica a la app, el sitio web y los servicios de Auriona (conjuntamente,
            "Servicios"). No se aplica a sitios de terceros enlazados desde Auriona.
          </P>

          <SectionTitle>3) Datos que podemos tratar</SectionTitle>
          <P>Dependiendo del uso y configuración, Auriona puede tratar:</P>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>
              <b style={{ color: C.text }}>Datos de cuenta</b>: email, credenciales (gestionadas por
              el proveedor de autenticación) y metadatos de cuenta.
            </Li>
            <Li>
              <b style={{ color: C.text }}>Preferencias</b>: idioma (por ejemplo: es/pt/en) y ajustes
              de usuario.
            </Li>
            <Li>
              <b style={{ color: C.text }}>Consentimientos</b>: confirmación de mayoría de edad (+18),
              aceptación de Términos y aceptación de esta Política (y, si implementás timestamps,
              fecha/hora).
            </Li>
            <Li>
              <b style={{ color: C.text }}>Datos de uso</b>: eventos técnicos básicos para
              funcionamiento, seguridad, diagnóstico de errores y métricas agregadas (por ejemplo,
              pantallas usadas, fallos, rendimiento).
            </Li>
            <Li>
              <b style={{ color: C.text }}>Geolocalización</b> (opcional): solo si activás "Usar mi
              ubicación" y otorgás permiso del dispositivo.
            </Li>
          </ul>

          <SectionTitle>4) Mayoría de edad (+18)</SectionTitle>
          <P>
            Auriona requiere confirmación de mayoría de edad para utilizar el servicio. No está
            diseñado ni dirigido a menores. Si detectamos que un menor utiliza la app, podremos
            restringir o eliminar la cuenta y tomar medidas razonables según corresponda.
          </P>

          <SectionTitle>5) Finalidades del tratamiento</SectionTitle>
          <P>Tratamos datos para:</P>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>Crear y administrar tu cuenta.</Li>
            <Li>Prestar el servicio y habilitar funcionalidades (incluyendo idioma y preferencias).</Li>
            <Li>Brindar soporte, responder consultas y gestionar incidentes técnicos.</Li>
            <Li>Mejorar el rendimiento, seguridad y estabilidad del servicio (métricas agregadas y diagnósticos).</Li>
            <Li>
              Si activás ubicación: ofrecer funciones dependientes del lugar (contexto local, resultados o personalización por zona).
            </Li>
            <Li>Cumplir obligaciones legales y requerimientos de autoridades competentes.</Li>
          </ul>

          <SectionTitle>6) Bases legales (según jurisdicción)</SectionTitle>
          <P>
            Usamos bases legales reconocidas por marcos de privacidad aplicables, según corresponda:
            consentimiento (por ejemplo, ubicación), ejecución del servicio/contrato (cuenta y acceso),
            intereses legítimos (seguridad y prevención de fraude, métricas técnicas) y obligaciones legales.
          </P>

          <SectionTitle>7) Geolocalización (opt-in) y retiro del consentimiento</SectionTitle>
          <P>
            La ubicación es opcional. Si marcás "Usar mi ubicación", Auriona solicitará permiso al sistema
            del dispositivo. Podés retirar el consentimiento:
          </P>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>Desactivando la casilla dentro de la app (si existe ajuste interno), y/o</Li>
            <Li>Revocando el permiso de ubicación en la configuración del sistema (Android/iOS).</Li>
          </ul>
          <P>
            Si retirás el consentimiento, dejaremos de tratar ubicación hacia adelante. Algunas funciones
            podrían quedar limitadas.
          </P>

          <SectionTitle>8) Conservación (retención)</SectionTitle>
          <P>
            Conservamos los datos por el tiempo necesario para las finalidades descritas, salvo que una norma
            exija o permita conservarlos por más tiempo (por ejemplo, cumplimiento legal, seguridad, prevención
            de fraude o resolución de disputas). Cuando ya no sean necesarios, los eliminamos o anonimamos razonablemente.
          </P>

          <SectionTitle>9) Compartición con terceros</SectionTitle>
          <P>
            Podemos compartir datos con proveedores que operan partes del servicio (por ejemplo, autenticación,
            hosting, base de datos, analítica técnica), bajo acuerdos y medidas de seguridad razonables.
          </P>
          <P>
            También podemos divulgar información si es requerido por ley, orden judicial o autoridad competente,
            o para proteger derechos, seguridad e integridad de usuarios, terceros o del servicio.
          </P>

          <SectionTitle>10) Transferencias internacionales</SectionTitle>
          <P>
            Dado que algunos proveedores pueden estar ubicados fuera de tu país, pueden ocurrir transferencias
            internacionales. Aplicamos salvaguardas razonables cuando corresponda, por ejemplo:
          </P>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>
              Para transferencias desde el EEE/UE: mecanismos del GDPR como cláusulas contractuales tipo (SCCs) cuando aplique.
            </Li>
            <Li>
              Para Argentina: consideración de reglas sobre transferencias a países sin nivel adecuado y uso de bases válidas cuando corresponda.
            </Li>
          </ul>

          <SectionTitle>11) Seguridad</SectionTitle>
          <P>
            Implementamos medidas técnicas y organizativas razonables para proteger los datos contra acceso no autorizado,
            pérdida, alteración o divulgación indebida. Ningún sistema es 100% seguro; por eso, también es importante que
            protejas tus credenciales.
          </P>

          <SectionTitle>12) Derechos del usuario</SectionTitle>
          <P>
            Según tu jurisdicción, podés tener derechos de acceso, rectificación, actualización, supresión/eliminación,
            oposición, portabilidad y/o limitación del tratamiento, y derecho a retirar el consentimiento.
          </P>
          <P>
            <b style={{ color: C.text }}>Argentina</b>: podés ejercer derechos de acceso y de rectificación/actualización/supresión,
            y reclamar ante la autoridad competente si corresponde.
          </P>
          <P>
            <b style={{ color: C.text }}>UE (GDPR) y UK (UK GDPR)</b>: derechos de información, acceso, rectificación, supresión,
            limitación, portabilidad, oposición y otros aplicables.
          </P>
          <P>
            <b style={{ color: C.text }}>California (CCPA/CPRA)</b>: derechos como conocer, borrar, corregir y optar por no
            "vender/compartir" (según aplique).
          </P>

          <SectionTitle>13) Cómo ejercer tus derechos</SectionTitle>
          <P>
            Para solicitudes de privacidad y derechos, escribinos a:{" "}
            <b style={{ color: C.text }}>[EMAIL LEGAL/PRIVACIDAD]</b>
            <br />
            Asunto sugerido: <b style={{ color: C.text }}>"Privacidad / Derechos de datos"</b>.
          </P>
          <P>
            Para proteger tu cuenta, podremos solicitar verificación razonable de identidad antes de responder.
          </P>

          <SectionTitle>14) Cookies y tecnologías similares (si aplica web)</SectionTitle>
          <P>
            Si Auriona incluye sitio web con cookies (analítica, sesión, etc.), se informará el uso y se ofrecerán opciones
            de configuración cuando corresponda por la normativa aplicable.
          </P>

          <SectionTitle>15) Cambios a esta Política</SectionTitle>
          <P>
            Podemos actualizar esta Política. Publicaremos la versión vigente con su fecha de actualización. Si el cambio es
            relevante, podremos notificarlo por medios razonables.
          </P>

          <SectionTitle>16) Contacto</SectionTitle>
          <P>
            Contacto general: <b style={{ color: C.text }}>[EMAIL DE CONTACTO]</b>
            <br />
            Privacidad/legal: <b style={{ color: C.text }}>[EMAIL LEGAL/PRIVACIDAD]</b>
          </P>

          <hr style={{ border: 0, borderTop: `1px solid ${C.border}`, margin: "18px 0" }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/" style={{ color: C.link, textDecoration: "underline", fontSize: 13 }}>
              Volver
            </a>
            <a href="/terms" style={{ color: C.link, textDecoration: "underline", fontSize: 13 }}>
              Ver Términos y Condiciones
            </a>
          </div>
        </div>

        <div style={{ marginTop: 12, color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
          Nota: este documento está diseñado para mostrarse en un entorno de app. Completá los campos{" "}
          <b style={{ color: C.text }}>[...]</b> con datos reales del titular.
        </div>
      </div>
    </main>
  );
}
