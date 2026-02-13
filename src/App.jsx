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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const formatearGoogleFecha = (fecha, hora) => {
    const date = new Date(`${fecha}T${hora}`);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const agregarAGoogleCalendar = () => {
    const inicio = formatearGoogleFecha(form.fecha, form.horaInicio);
    const fin = formatearGoogleFecha(form.fecha, form.horaFin);

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      form.titulo
    )}&dates=${inicio}/${fin}&details=${encodeURIComponent(
      form.descripcion + " | Ponente: " + form.ponente
    )}&location=${encodeURIComponent(form.lugar)}`;

    window.open(url, "_blank");
  };

  const generarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("HOSPITAL GENERAL SALAMANCA", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text("AGENDA DE CAPACITACIÓN", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Título: ${form.titulo}`, 20, 50);
    doc.text(`Ponente: ${form.ponente}`, 20, 60);
    doc.text(`Fecha: ${form.fecha}`, 20, 70);
    doc.text(`Horario: ${form.horaInicio} - ${form.horaFin}`, 20, 80);
    doc.text(`Lugar: ${form.lugar}`, 20, 90);

    doc.text("Descripción:", 20, 105);
    doc.text(doc.splitTextToSize(form.descripcion, 170), 20, 115);

    doc.save("Agenda_Capacitacion_HGS.pdf");
  };

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", fontFamily: "Arial" }}>
      <h2 style={{ textAlign: "center" }}>
        Sistema de Agenda de Capacitación
      </h2>

      <input name="titulo" placeholder="Título" onChange={handleChange} /><br /><br />
      <input name="ponente" placeholder="Ponente" onChange={handleChange} /><br /><br />
      <input type="date" name="fecha" onChange={handleChange} /><br /><br />
      <input type="time" name="horaInicio" onChange={handleChange} />
      <input type="time" name="horaFin" onChange={handleChange} /><br /><br />
      <input name="lugar" placeholder="Lugar" onChange={handleChange} /><br /><br />
      <textarea name="descripcion" placeholder="Carta descriptiva" onChange={handleChange} rows="4" style={{ width: "100%" }} /><br /><br />

      <button onClick={agregarAGoogleCalendar}>Agregar a Google Calendar</button>
      <button onClick={generarPDF} style={{ marginLeft: "10px" }}>
        Exportar PDF
      </button>
    </div>
  );
}

export default App;
