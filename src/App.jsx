
import { useState } from "react";
import jsPDF from "jspdf";
import "./App.css";

function App() {
  const [form, setForm] = useState({
    titulo: "",
    ponente: "",
    fecha: "",
    horaInicio: "",
    horaFin: "",
    lugar: "",
    descripcion: "",
  });

  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [enlaceEvento, setEnlaceEvento] = useState("");

  const handleChange = (e) => {
    setForm((anterior) => ({
      ...anterior,
      [e.target.name]: e.target.value,
    }));
  };

  const agregarAGoogleCalendar = async (e) => {
    e.preventDefault();
    setMensaje("");
    setEnlaceEvento("");

    if (
      !form.titulo.trim() ||
      !form.fecha ||
      !form.horaInicio ||
      !form.horaFin ||
      !password
    ) {
      setMensaje("Completa el título, fecha, horario y contraseña.");
      return;
    }

    if (form.horaFin <= form.horaInicio) {
      setMensaje("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/capacitaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agenda-password": password,
        },
        body: JSON.stringify(form),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo registrar la capacitación."
        );
      }

      setMensaje("Capacitación registrada correctamente.");
      setEnlaceEvento(resultado.enlace || "");
      setPassword("");
    } catch (error) {
      setMensaje(
        error.message ||
          "No se pudo conectar con el servidor. Intenta nuevamente."
      );
    } finally {
      setEnviando(false);
    }
  };

  const generarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("HOSPITAL GENERAL SALAMANCA", 105, 20, {
      align: "center",
    });

    doc.setFontSize(14);
    doc.text("AGENDA DE CAPACITACIÓN", 105, 30, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.text(`Título: ${form.titulo}`, 20, 50);
    doc.text(`Ponente: ${form.ponente}`, 20, 60);
    doc.text(`Fecha: ${form.fecha}`, 20, 70);
    doc.text(
      `Horario: ${form.horaInicio} - ${form.horaFin}`,
      20,
      80
    );
    doc.text(`Lugar: ${form.lugar}`, 20, 90);

    doc.text("Descripción:", 20, 105);

    const descripcion = doc.splitTextToSize(
      form.descripcion || "Sin descripción",
      170
    );

    doc.text(descripcion, 20, 115);
    doc.save("Agenda_Capacitacion_HGS.pdf");
  };

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "0 16px",
        fontFamily: "Arial",
      }}
    >
      <h2 style={{ textAlign: "center" }}>
        Sistema de Agenda de Capacitación
      </h2>

      <form onSubmit={agregarAGoogleCalendar}>
        <label htmlFor="titulo">Título de la capacitación</label>
        <input
          id="titulo"
          name="titulo"
          value={form.titulo}
          onChange={handleChange}
          placeholder="Título"
          required
        />
        <br />
        <br />

        <label htmlFor="ponente">Ponente</label>
        <input
          id="ponente"
          name="ponente"
          value={form.ponente}
          onChange={handleChange}
          placeholder="Ponente"
        />
        <br />
        <br />

        <label htmlFor="fecha">Fecha</label>
        <input
          id="fecha"
          type="date"
          name="fecha"
          value={form.fecha}
          onChange={handleChange}
          required
        />
        <br />
        <br />

        <label htmlFor="horaInicio">Hora de inicio</label>
        <input
          id="horaInicio"
          type="time"
          name="horaInicio"
          value={form.horaInicio}
          onChange={handleChange}
          required
        />

        <label htmlFor="horaFin">Hora de fin</label>
        <input
          id="horaFin"
          type="time"
          name="horaFin"
          value={form.horaFin}
          onChange={handleChange}
          required
        />
        <br />
        <br />

        <label htmlFor="lugar">Lugar</label>
        <input
          id="lugar"
          name="lugar"
          value={form.lugar}
          onChange={handleChange}
          placeholder="Lugar"
        />
        <br />
        <br />

        <label htmlFor="descripcion">Carta descriptiva</label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Carta descriptiva"
          rows="4"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
        <br />
        <br />

        <label htmlFor="agendaPassword">
          Contraseña de acceso a la agenda
        </label>
        <input
          id="agendaPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Introduce la contraseña autorizada"
          autoComplete="off"
          required
        />
        <br />
        <br />

        <button type="submit" disabled={enviando}>
          {enviando
            ? "Registrando..."
            : "Registrar en calendario institucional"}
        </button>

        <button
          type="button"
          onClick={generarPDF}
          style={{ marginLeft: "10px" }}
        >
          Exportar PDF
        </button>
      </form>

      {mensaje && (
        <p role="status" aria-live="polite">
          {mensaje}
        </p>
      )}

      {enlaceEvento && (
        <p>
          <a href={enlaceEvento} target="_blank" rel="noreferrer">
            Ver capacitación en Google Calendar
          </a>
        </p>
      )}
    </div>
  );
}

export default App;
