"use client";

import React from "react";

export default function TermsPage() {
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
              Términos y Condiciones
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
            Términos y Condiciones de Uso
          </h1>

          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
            Estos Términos regulan el acceso y uso de la aplicación, sitio web y/o servicios de Auriona ("Auriona",
            "nosotros", "nuestro"). Al crear una cuenta, iniciar sesión o utilizar Auriona, aceptás estos Términos.
            Si no estás de acuerdo, no uses Auriona.
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
          <SectionTitle>1) Identificación del responsable</SectionTitle>
          <P>
            Titular/Operador: <b style={{ color: C.text }}>[RAZÓN SOCIAL / NOMBRE LEGAL]</b>. <br />
            Domicilio: <b style={{ color: C.text }}>[DOMICILIO LEGAL]</b>. <br />
            Correo de contacto: <b style={{ color: C.text }}>[EMAIL DE CONTACTO]</b>. <br />
            Correo para asuntos legales/privacidad: <b style={{ color: C.text }}>[EMAIL LEGAL/PRIVACIDAD]</b>.
          </P>

          <SectionTitle>2) Edad mínima (+18) y capacidad</SectionTitle>
          <P>
            Auriona está destinado exclusivamente a personas <b style={{ color: C.text }}>mayores de 18 años</b> (o la mayoría
            de edad legal aplicable en su jurisdicción si fuese superior). En el login, marcás una casilla confirmando tu
            mayoría de edad. Si no cumplís este requisito, no debes utilizar Auriona.
          </P>
          <P>
            Nos reservamos el derecho de restringir, suspender o cancelar cuentas si detectamos uso por menores o información falsa
            respecto de la edad.
          </P>

          <SectionTitle>3) Cuenta, credenciales y seguridad</SectionTitle>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>Debés brindar información veraz y mantenerla actualizada.</Li>
            <Li>Sos responsable de la confidencialidad de tus credenciales y del uso de tu cuenta.</Li>
            <Li>Debés notificarnos de inmediato si sospechás acceso no autorizado a tu cuenta o vulneraciones de seguridad.</Li>
          </ul>

          <SectionTitle>4) Descripción del servicio</SectionTitle>
          <P>
            Auriona ofrece funcionalidades de asistencia digital (incluyendo, según configuración, funciones basadas en IA y herramientas
            de organización, comunicación o recomendación). Auriona puede mostrar contenido informativo o sugerencias, pero no reemplaza
            asesoramiento profesional (médico, legal, financiero u otro).
          </P>

          <SectionTitle>5) Uso de geolocalización (opt-in)</SectionTitle>
          <P>
            En el login podés optar por "Usar mi ubicación". La geolocalización solo se utiliza si otorgás permiso (consentimiento) en tu
            dispositivo y activás dicha opción.
          </P>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>
              Si activás la ubicación, Auriona puede usarla para funciones dependientes del contexto geográfico (por ejemplo, resultados o
              recomendaciones locales, o personalización vinculada a zona).
            </Li>
            <Li>Podés desactivar el permiso desde tu dispositivo o desde la app (si hubiera ajuste interno) y retirar tu consentimiento en cualquier momento.</Li>
            <Li>Si no activás la ubicación, Auriona seguirá funcionando, salvo funciones que dependan de ella.</Li>
          </ul>

          <SectionTitle>6) Conductas prohibidas</SectionTitle>
          <P>No podés usar Auriona para:</P>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>Violar leyes, regulaciones o derechos de terceros.</Li>
            <Li>Intentar acceder sin autorización a sistemas, cuentas o datos.</Li>
            <Li>Distribuir malware, phishing o contenido destinado a dañar o interferir con el servicio.</Li>
            <Li>Reproducir, copiar, descompilar o explotar el software salvo que la ley lo permita expresamente.</Li>
            <Li>Usar el servicio para spam, acoso, amenazas o actividades abusivas.</Li>
          </ul>

          <SectionTitle>7) Contenido del usuario</SectionTitle>
          <P>
            Si Auriona permite cargar o enviar contenido (texto, imágenes u otros), garantizás que tenés los derechos necesarios para hacerlo
            y que no infringís derechos de terceros.
          </P>
          <P>
            Nos otorgás una licencia limitada para alojar, procesar y mostrar ese contenido únicamente para operar el servicio, prestar soporte
            y cumplir obligaciones legales.
          </P>

          <SectionTitle>8) Propiedad intelectual</SectionTitle>
          <P>
            Auriona, su marca, logos, diseño, interfaces, código, documentación y demás elementos son propiedad de{" "}
            <b style={{ color: C.text }}>[RAZÓN SOCIAL / TITULAR]</b> o de sus licenciantes, y están protegidos por leyes de propiedad intelectual.
            Se prohíbe el uso no autorizado.
          </P>

          <SectionTitle>9) Disponibilidad, cambios y suspensión</SectionTitle>
          <ul style={{ margin: "10px 0 0 18px" }}>
            <Li>Auriona puede actualizar, modificar o discontinuar funcionalidades por motivos técnicos, de seguridad, cumplimiento o mejora.</Li>
            <Li>Podemos suspender o cancelar el acceso si hay incumplimientos de estos Términos, riesgos de seguridad o requerimientos legales.</Li>
          </ul>

          <SectionTitle>10) Exención y limitación de responsabilidad</SectionTitle>
          <P>
            Auriona se ofrece "tal cual" y "según disponibilidad". En la máxima medida permitida por ley, no garantizamos que el servicio sea
            ininterrumpido, libre de errores o completamente seguro.
          </P>
          <P>
            Auriona puede generar contenido o sugerencias. <b style={{ color: C.text }}>No garantizamos exactitud absoluta</b> ni asumimos responsabilidad
            por decisiones tomadas por el usuario basadas en el contenido.
          </P>
          <P>
            En la medida permitida por ley, Auriona no será responsable por daños indirectos, incidentales, especiales, consecuenciales, pérdida de datos
            o lucro cesante derivados del uso o imposibilidad de uso del servicio.
          </P>

          <SectionTitle>11) Pagos y suscripciones (si aplica)</SectionTitle>
          <P>
            Si Auriona ofrece funciones pagas o suscripciones, se informarán precios, impuestos, condiciones de facturación, renovaciones y mecanismos de
            cancelación dentro de la app y/o en una política comercial separada.
          </P>

          <SectionTitle>12) Privacidad y protección de datos</SectionTitle>
          <P>
            El tratamiento de datos personales se rige por la <b style={{ color: C.text }}>Política de Privacidad</b> disponible en{" "}
            <a href="/privacy" style={{ color: C.link, textDecoration: "underline" }}>
              /privacy
            </a>
            . Al aceptar estos Términos, también aceptás la Política de Privacidad.
          </P>

          <SectionTitle>13) Modificaciones de estos Términos</SectionTitle>
          <P>
            Podemos actualizar estos Términos. Publicaremos la versión vigente con fecha de actualización. Si los cambios son materiales, podremos notificarlo
            por medios razonables. El uso posterior implica aceptación.
          </P>

          <SectionTitle>14) Ley aplicable y jurisdicción</SectionTitle>
          <P>
            Estos Términos se regirán por las leyes de <b style={{ color: C.text }}>[PAÍS/PROVINCIA DE SEDE LEGAL]</b>, sin perjuicio de normas imperativas
            de protección al consumidor y privacidad que resulten aplicables por tu residencia. Jurisdicción:{" "}
            <b style={{ color: C.text }}>[TRIBUNALES COMPETENTES]</b>.
          </P>

          <SectionTitle>15) Contacto</SectionTitle>
          <P>
            Para consultas sobre estos Términos: <b style={{ color: C.text }}>[EMAIL DE CONTACTO]</b>. <br />
            Para asuntos legales/privacidad: <b style={{ color: C.text }}>[EMAIL LEGAL/PRIVACIDAD]</b>.
          </P>

          <hr style={{ border: 0, borderTop: `1px solid ${C.border}`, margin: "18px 0" }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/" style={{ color: C.link, textDecoration: "underline", fontSize: 13 }}>
              Volver
            </a>
            <a href="/privacy" style={{ color: C.link, textDecoration: "underline", fontSize: 13 }}>
              Ver Política de Privacidad
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
