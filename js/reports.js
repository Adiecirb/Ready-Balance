// reports.js — Generación de PDF con jsPDF (cargado vía CDN en dashboard.html)
// Requiere: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js">

import { log } from './config.js';

// Colores del sistema
const VERDE  = [108, 190, 113];
const OSCURO = [26,  54,  54];
const GRIS   = [140, 155, 165];
const CLARO  = [234, 244, 244];

// ── API pública ───────────────────────────────────────────

/**
 * Genera PDF del plan nutricional completo (4 páginas).
 */
export async function generarReportePlan(perfil) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  _paginaPortada(doc, perfil);
  doc.addPage();
  _paginaResumenNutricional(doc, perfil);
  doc.addPage();
  _paginaPlanComidas(doc, perfil);
  doc.addPage();
  _paginaListaCompra(doc, perfil);

  const nombre  = (perfil.nombre ?? 'usuario').replace(/\s+/g, '_');
  const fecha   = new Date().toISOString().split('T')[0];
  doc.save(`ReadyBalance_${nombre}_${fecha}.pdf`);
  log.info('PDF plan generado');
}

/**
 * Genera PDF de reporte de progreso semanal (3 páginas).
 */
export async function generarReporteProgreso(perfil, stats) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  _paginaProgresoPortada(doc, perfil, stats);
  doc.addPage();
  _paginaEstadisticasSemana(doc, perfil, stats);
  doc.addPage();
  _paginaDiasDetalle(doc, stats);

  const nombre = (perfil.nombre ?? 'usuario').replace(/\s+/g, '_');
  const fecha  = new Date().toISOString().split('T')[0];
  doc.save(`ReadyBalance_Progreso_${nombre}_${fecha}.pdf`);
  log.info('PDF progreso generado');
}

// ── Páginas del plan ──────────────────────────────────────

function _paginaPortada(doc, perfil) {
  _fondo(doc);
  _logoTexto(doc, 'PLAN NUTRICIONAL', 'Ready Balance');

  const macros = perfil.macros ?? {};
  const imc    = perfil.imc    ?? {};
  const y0     = 90;

  _seccion(doc, 'Datos del usuario', y0);
  const datos = [
    ['Nombre',    perfil.nombre    ?? '—'],
    ['Género',    perfil.genero    ?? '—'],
    ['Edad',      perfil.edad ? perfil.edad + ' años' : '—'],
    ['Peso',      perfil.peso ? perfil.peso + ' kg' : '—'],
    ['Estatura',  perfil.estatura ? perfil.estatura + ' cm' : '—'],
    ['Objetivo',  _labelObj(perfil.objetivo)],
    ['Actividad', _labelAct(perfil.actividad)],
    ['IMC',       imc.imc ? `${imc.imc} — ${imc.clasificacion}` : '—'],
    ['TMB',       perfil.tmb ? Math.round(perfil.tmb) + ' kcal' : '—'],
    ['TDEE',      perfil.tdee ? perfil.tdee + ' kcal' : '—']
  ];

  _tabla2col(doc, datos, y0 + 10);

  _seccion(doc, 'Macros objetivo / día', 175);
  _fila4macros(doc, macros, 185);

  _pie(doc, 1);
}

function _paginaResumenNutricional(doc, perfil) {
  _cabecera(doc, 'Resumen Nutricional');
  const macros = perfil.macros ?? {};
  let y = 50;

  doc.setFontSize(11).setTextColor(...OSCURO);
  doc.text('Distribución de macronutrientes:', 20, y); y += 10;

  const barras = [
    { label: 'Proteína',      valor: macros.proteina ?? 0,      unidad: 'g', pct: 0.30, color: [240, 154, 89] },
    { label: 'Carbohidratos', valor: macros.carbohidratos ?? 0, unidad: 'g', pct: 0.50, color: VERDE },
    { label: 'Grasas',        valor: macros.grasas ?? 0,        unidad: 'g', pct: 0.20, color: [91, 164, 207] }
  ];

  barras.forEach(b => {
    doc.setFontSize(10).setTextColor(...GRIS);
    doc.text(`${b.label}: ${b.valor}${b.unidad}`, 20, y);
    doc.setFillColor(...CLARO);
    doc.roundedRect(65, y - 5, 110, 8, 2, 2, 'F');
    doc.setFillColor(...b.color);
    doc.roundedRect(65, y - 5, Math.round(110 * b.pct), 8, 2, 2, 'F');
    doc.setTextColor(...OSCURO).setFontSize(9);
    doc.text(`${Math.round(b.pct * 100)}%`, 180, y);
    y += 16;
  });

  y += 6;
  _seccion(doc, 'Calorías totales', y); y += 12;
  doc.setFontSize(28).setTextColor(...VERDE);
  doc.text(`${macros.calorias ?? 0} kcal/día`, 105, y, { align: 'center' });

  _pie(doc, 2);
}

function _paginaPlanComidas(doc, perfil) {
  _cabecera(doc, 'Plan de Alimentación');
  const comidas = perfil.comidas ?? [];
  let y = 50;

  comidas.forEach(comida => {
    if (y > 250) { doc.addPage(); _cabecera(doc, 'Plan de Alimentación (cont.)'); y = 50; }

    // Header de comida
    doc.setFillColor(...VERDE);
    doc.roundedRect(15, y, 180, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255).setFontSize(10).setFont(undefined, 'bold');
    doc.text(`${comida.nombre} — ${comida.calorias} kcal`, 20, y + 6);
    doc.setFont(undefined, 'normal');
    y += 13;

    // Items
    (comida.items ?? []).forEach(item => {
      if (y > 270) { doc.addPage(); _cabecera(doc, 'Plan de Alimentación (cont.)'); y = 50; }
      doc.setTextColor(...OSCURO).setFontSize(9);
      doc.text(`• ${item.nombre}`, 22, y);
      doc.setTextColor(...GRIS).setFontSize(8);
      doc.text(`${item.gramos}g  |  P: ${item.macros.proteina}g  C: ${item.macros.carbohidratos}g  G: ${item.macros.grasas}g  ${item.macros.calorias}kcal`, 80, y);
      y += 7;
    });

    // Totales reales
    const tot = comida.totalesReales;
    if (tot) {
      doc.setTextColor(...GRIS).setFontSize(8);
      doc.text(`Total real: ${tot.calorias} kcal · P:${tot.proteina}g · C:${tot.carbohidratos}g · G:${tot.grasas}g`, 22, y);
      y += 5;
    }
    y += 6;
  });

  _pie(doc, 3);
}

function _paginaListaCompra(doc, perfil) {
  _cabecera(doc, 'Lista de Compra — Semana');
  let y = 50;

  // Agrupar por categoría
  const grupos = {};
  (perfil.comidas ?? []).forEach(c => {
    (c.items ?? []).forEach(item => {
      if (!grupos[item.categoria]) grupos[item.categoria] = {};
      if (!grupos[item.categoria][item.id]) {
        grupos[item.categoria][item.id] = { nombre: item.nombre, gramos: 0, unidad: item.unidad };
      }
      grupos[item.categoria][item.id].gramos += item.gramosCompra * 7;
    });
  });

  Object.entries(grupos).forEach(([cat, items]) => {
    if (y > 260) { doc.addPage(); _cabecera(doc, 'Lista de Compra (cont.)'); y = 50; }
    doc.setFontSize(10).setTextColor(...VERDE).setFont(undefined, 'bold');
    doc.text(cat.toUpperCase(), 20, y); y += 8;
    doc.setFont(undefined, 'normal');
    Object.values(items).forEach(item => {
      doc.setTextColor(...OSCURO).setFontSize(9);
      doc.text(`□  ${item.nombre}`, 25, y);
      doc.setTextColor(...GRIS);
      doc.text(`${Math.round(item.gramos)} ${item.unidad}`, 155, y);
      y += 7;
    });
    y += 4;
  });

  _pie(doc, 4);
}

// ── Páginas de progreso ───────────────────────────────────

function _paginaProgresoPortada(doc, perfil, stats) {
  _fondo(doc);
  _logoTexto(doc, 'REPORTE DE PROGRESO', 'Ready Balance');

  const y0 = 90;
  _seccion(doc, 'Resumen de la semana', y0);
  const datos = [
    ['Días registrados',    String(stats.diasRegistrados ?? 0)],
    ['Cumplimiento',        (stats.cumplimiento ?? 0) + '%'],
    ['Prom. calorías/día',  String(stats.promCalorias ?? 0) + ' kcal'],
    ['Peso actual',         stats.pesoActual ? stats.pesoActual + ' kg' : '—'],
    ['Peso inicial (7d)',   stats.pesoInicial ? stats.pesoInicial + ' kg' : '—'],
    ['Tendencia',           stats.tendenciaPeso !== null ? (stats.tendenciaPeso > 0 ? '+' : '') + stats.tendenciaPeso + ' kg' : '—']
  ];
  _tabla2col(doc, datos, y0 + 10);
  _pie(doc, 1);
}

function _paginaEstadisticasSemana(doc, perfil, stats) {
  _cabecera(doc, 'Estadísticas Semanales');
  const macros = perfil.macros ?? {};
  let y = 50;

  const barras = [
    { label: 'Proteína prom.',   valor: Math.round(stats.filas?.reduce((s,f)=>s+f.proteina,0)/(stats.diasRegistrados||1)), meta: macros.proteina ?? 1 },
    { label: 'Carbos prom.',     valor: Math.round(stats.filas?.reduce((s,f)=>s+f.carbohidratos,0)/(stats.diasRegistrados||1)), meta: macros.carbohidratos ?? 1 },
    { label: 'Grasas prom.',     valor: Math.round(stats.filas?.reduce((s,f)=>s+f.grasas,0)/(stats.diasRegistrados||1)), meta: macros.grasas ?? 1 },
    { label: 'Calorías prom.',   valor: stats.promCalorias ?? 0, meta: macros.calorias ?? 1 }
  ];

  barras.forEach(b => {
    const pct = Math.min(b.valor / b.meta, 1);
    doc.setFontSize(10).setTextColor(...OSCURO);
    doc.text(`${b.label}: ${b.valor}`, 20, y);
    doc.setFillColor(...CLARO); doc.roundedRect(80, y-5, 100, 7, 1, 1, 'F');
    doc.setFillColor(...VERDE); doc.roundedRect(80, y-5, Math.round(100*pct), 7, 1, 1, 'F');
    doc.setFontSize(8).setTextColor(...GRIS);
    doc.text(`/ ${b.meta}`, 185, y);
    y += 16;
  });

  _pie(doc, 2);
}

function _paginaDiasDetalle(doc, stats) {
  _cabecera(doc, 'Detalle por Día');
  let y = 50;

  // Encabezado tabla
  const cols = ['Día', 'Calorías', 'Prot.', 'Carb.', 'Grasas', 'Peso'];
  const xs   = [18, 52, 85, 110, 135, 160];
  doc.setFillColor(...VERDE);
  doc.rect(15, y-6, 180, 9, 'F');
  doc.setTextColor(255,255,255).setFontSize(8).setFont(undefined,'bold');
  cols.forEach((c, i) => doc.text(c, xs[i], y));
  doc.setFont(undefined,'normal'); y += 8;

  (stats.filas ?? []).forEach((fila, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(247,250,250); doc.rect(15, y-5, 180, 8, 'F'); }
    doc.setTextColor(...OSCURO).setFontSize(8);
    const vals = [fila.etiqueta, fila.calorias||'—', fila.proteina+'g', fila.carbohidratos+'g', fila.grasas+'g', fila.peso ? fila.peso+'kg' : '—'];
    vals.forEach((v, i) => doc.text(String(v), xs[i], y));
    y += 9;
  });

  _pie(doc, 3);
}

// ── Helpers de dibujo ─────────────────────────────────────

function _fondo(doc) {
  doc.setFillColor(...OSCURO);
  doc.rect(0, 0, 210, 297, 'F');
}

function _logoTexto(doc, titulo, sub) {
  doc.setTextColor(255,255,255).setFontSize(28).setFont(undefined,'bold');
  doc.text(titulo, 105, 55, { align: 'center' });
  doc.setFontSize(13).setFont(undefined,'normal').setTextColor(...VERDE);
  doc.text(sub, 105, 68, { align: 'center' });
  // Decoración
  doc.setFillColor(...VERDE);
  doc.rect(40, 74, 130, 1, 'F');
}

function _seccion(doc, titulo, y) {
  doc.setFillColor(...VERDE);
  doc.roundedRect(15, y, 180, 8, 2, 2, 'F');
  doc.setTextColor(255,255,255).setFontSize(10).setFont(undefined,'bold');
  doc.text(titulo, 20, y + 5.5);
  doc.setFont(undefined,'normal');
}

function _cabecera(doc, titulo) {
  doc.setFillColor(...OSCURO);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255,255,255).setFontSize(14).setFont(undefined,'bold');
  doc.text(titulo, 105, 18, { align: 'center' });
  doc.setFont(undefined,'normal');
}

function _tabla2col(doc, filas, y0) {
  filas.forEach(([label, valor], i) => {
    const y = y0 + i * 10;
    if (i % 2 === 0) { doc.setFillColor(...CLARO); doc.rect(15, y-4, 180, 9, 'F'); }
    doc.setFontSize(9).setTextColor(...GRIS).setFont(undefined,'bold');
    doc.text(label, 20, y + 1);
    doc.setFont(undefined,'normal').setTextColor(...OSCURO);
    doc.text(valor, 90, y + 1);
  });
}

function _fila4macros(doc, macros, y) {
  const items = [
    ['🔥 Calorías', macros.calorias ?? 0, 'kcal'],
    ['🥩 Proteína', macros.proteina ?? 0, 'g'],
    ['🍞 Carbos',   macros.carbohidratos ?? 0, 'g'],
    ['🥑 Grasas',   macros.grasas ?? 0, 'g']
  ];
  const ancho = 42;
  items.forEach((item, i) => {
    const x = 16 + i * (ancho + 3);
    doc.setFillColor(...CLARO); doc.roundedRect(x, y, ancho, 22, 2, 2, 'F');
    doc.setTextColor(...VERDE).setFontSize(14).setFont(undefined,'bold');
    doc.text(String(item[1]), x + ancho/2, y + 10, { align: 'center' });
    doc.setFont(undefined,'normal').setTextColor(...GRIS).setFontSize(7);
    doc.text(item[2], x + ancho/2, y + 16, { align: 'center' });
    doc.text(item[0], x + ancho/2, y + 20, { align: 'center' });
  });
}

function _pie(doc, pagina) {
  doc.setFontSize(8).setTextColor(...GRIS);
  doc.text(`Ready Balance · Pág. ${pagina}`, 105, 290, { align: 'center' });
  doc.text(new Date().toLocaleDateString('es-MX'), 190, 290, { align: 'right' });
}

function _labelObj(k) {
  return { perdida_rapida:'Pérdida rápida', perdida_moderada:'Pérdida moderada', mantenimiento:'Mantenimiento', ganancia_limpia:'Ganancia limpia', volumen:'Volumen' }[k] ?? k ?? '—';
}

function _labelAct(k) {
  return { sedentario:'Sedentario', ligero:'Ligero', moderado:'Moderado', activo:'Activo', muy_activo:'Muy activo' }[k] ?? k ?? '—';
}