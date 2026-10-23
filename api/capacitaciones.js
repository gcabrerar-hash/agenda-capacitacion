```javascript
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API =
  "https://www.googleapis.com/calendar/v3/calendars";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function crearJWT() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!email || !privateKey || !calendarId) {
    throw new Error("Faltan variables de entorno de Google.");
  }

  const ahora = Math.floor(Date.now() / 1000);

  const cabecera = base64url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );

  const carga = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: TOKEN_URL,
      iat: ahora,
      exp: ahora + 3600,
    })
  );

  const mensaje = `${cabecera}.${carga}`;

  const firma = crypto
    .sign("RSA-SHA256", Buffer.from(mensaje), privateKey)
    .toString("base64url");

  return `${mensaje}.${firma}`;
}

async function obtenerToken() {
  const respuesta = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: crearJWT(),
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.access_token) {
    console.error(
      "Error de autenticación con Google:",
      respuesta.status,
      datos.error || "Sin token de acceso"
    );

    throw new Error("Falló la autenticación con Google.");
  }

  return datos.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  // Verificar la contraseña antes de acceder a Google Calendar.
  const esperada = process.env.AGENDA_ACCESS_PASSWORD;
  const recibida = req.headers["x-agenda-password"];

  if (
    !esperada ||
    typeof recibida !== "string" ||
    Buffer.byteLength(recibida) !== Buffer.byteLength(esperada) ||
    !crypto.timingSafeEqual(
      Buffer.from(recibida),
      Buffer.from(esperada)
    )
  ) {
    return res.status(401).json({
      error: "Acceso no autorizado. Verifica tu contraseña.",
    });
  }

  const {
    titulo,
    ponente,
    fecha,
    horaInicio,
    horaFin,
    lugar,
    descripcion,
  } = req.body || {};

  // Validar los campos obligatorios y el formato de fecha y hora.
  if (
    typeof titulo !== "string" ||
    !titulo.trim() ||
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    typeof horaInicio !== "string" ||
    !/^\d{2}:\d{2}$/.test(horaInicio) ||
    typeof horaFin !== "string" ||
    !/^\d{2}:\d{2}$/.test(horaFin) ||
    horaFin <= horaInicio
  ) {
    return res.status(400).json({
      error: "Revisa el título, la fecha y el horario.",
    });
  }

  // Comprobar que la fecha y las horas sean reales.
  const fechaComprobada = new Date(`${fecha}T12:00:00Z`);

  if (
    Number.isNaN(fechaComprobada.getTime()) ||
    fechaComprobada.toISOString().slice(0, 10) !== fecha
  ) {
    return res.status(400).json({
      error: "La fecha indicada no es válida.",
    });
  }

  const [horaIni, minutoIni] = horaInicio.split(":").map(Number);
  const [horaFinNum, minutoFin] = horaFin.split(":").map(Number);

  if (
    horaIni > 23 ||
    minutoIni > 59 ||
    horaFinNum > 23 ||
    minutoFin > 59
  ) {
    return res.status(400).json({
      error: "La hora de inicio o de fin no es válida.",
    });
  }

  try {
    const token = await obtenerToken();

    const calendario = encodeURIComponent(
      process.env.GOOGLE_CALENDAR_ID
    );

    const evento = {
      summary: titulo.trim(),
      description: [
        typeof descripcion === "string" ? descripcion.trim() : "",
        typeof ponente === "string" && ponente.trim()
          ? `Ponente: ${ponente.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      location: typeof lugar === "string" ? lugar.trim() : "",
      start: {
        dateTime: `${fecha}T${horaInicio}:00`,
        timeZone: "America/Mexico_City",
      },
      end: {
        dateTime: `${fecha}T${horaFin}:00`,
        timeZone: "America/Mexico_City",
      },
    };

    const respuesta = await fetch(
      `${CALENDAR_API}/${calendario}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evento),
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();

      console.error(
        "Error de Google Calendar:",
        respuesta.status,
        detalle
      );

      return res.status(502).json({
        error: "Google Calendar no pudo crear el evento.",
      });
    }

    const creado = await respuesta.json();

    return res.status(201).json({
      mensaje: "Capacitación registrada.",
      eventoId: creado.id,
      enlace: creado.htmlLink,
    });
  } catch (error) {
    console.error(
      "Error al registrar capacitación:",
      error.message
    );

    return res.status(500).json({
      error: "No se pudo registrar la capacitación.",
    });
  }
}
```
