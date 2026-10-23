
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

  if (!email || !privateKey || !process.env.GOOGLE_CALENDAR_ID) {
    throw new Error("Faltan variables de entorno.");
  }

  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
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

  if (!respuesta.ok) {
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

  // Debajo de este punto conserva el resto del código existente:
  // lectura de req.body, validaciones y creación del evento.

    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
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

  if (
    typeof titulo !== "string" ||
    !titulo.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha || "") ||
    !/^\d{2}:\d{2}$/.test(horaInicio || "") ||
    !/^\d{2}:\d{2}$/.test(horaFin || "") ||
    horaFin <= horaInicio
  ) {
    return res.status(400).json({
      error: "Revisa el título, la fecha y el horario.",
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
        typeof descripcion === "string" ? descripcion : "",
        typeof ponente === "string" && ponente
          ? `Ponente: ${ponente}`
          : "",
      ].filter(Boolean).join("\n"),
      location: typeof lugar === "string" ? lugar : "",
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
      console.error("Google Calendar respondió:", respuesta.status);
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
    console.error("Error al registrar capacitación:", error.message);
    return res.status(500).json({
      error: "No se pudo registrar la capacitación.",
    });
  }
}
