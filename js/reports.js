// reports.js — Generación de reportes PDF con jsPDF (sin dependencias de build)
// Usa jsPDF desde CDN: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js

// ── Colores del proyecto ──────────────────────────────────
const C = {
  verde:      [39, 174, 96],
  verdeOsc:   [28, 125, 69],
  oscuro:     [44, 62, 80],
  gris:       [140, 155, 165],
  grisClaoro: [238, 238, 238],
  blanco:     [255, 255, 255],
  naranja:    [240, 154, 89],
  fondo:      [245, 250, 248]
};

// ── API pública ───────────────────────────────────────────

/**
 * Genera y descarga el reporte PDF del plan nutricional.
 * @param {Object} perfil — perfil completo del usuario desde cache
 */
export async function generarReportePlan(perfil) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('Error: jsPDF no cargó. Verifica tu conexión.'); return; }

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();   // 210 mm
  let   y     = 0;

  y = _portada(doc, perfil, ancho, y);
  doc.addPage();
  y = _resumenNutricional(doc, perfil, ancho, 15);
  doc.addPage();
  y = _planAlimenticio(doc, perfil, ancho, 15);

  if ((perfil.comidas ?? []).length) {
    doc.addPage();
    y = _listaCompra(doc, perfil, ancho, 15);
  }

  _pie(doc, ancho);

  const nombre = (perfil.nombre ?? 'plan').replace(/\s+/g, '_');
  doc.save(`ReadyBalance_${nombre}_${_fechaHoy()}.pdf`);
}

/**
 * Genera y descarga el reporte semanal de progreso.
 * @param {Object} perfil — perfil completo
 * @param {Object} stats  — estadísticas de tracker.js → estadisticasSemana()
 */
export async function generarReporteProgreso(perfil, stats) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('Error: jsPDF no cargó.'); return; }

  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ancho  = doc.internal.pageSize.getWidth();
  let   y      = 0;

  y = _portadaProgreso(doc, perfil, ancho, y);
  doc.addPage();
  y = _resumenSemana(doc, perfil, stats, ancho, 15);
  doc.addPage();
  y = _tablaDiaria(doc, stats, ancho, 15);

  _pie(doc, ancho);

  const nombre = (perfil.nombre ?? 'progreso').replace(/\s+/g, '_');
  doc.save(`ReadyBalance_Progreso_${nombre}_${_fechaHoy()}.pdf`);
}

// ══════════════════════════════════════════════════════════
// SECCIONES INTERNAS
// ══════════════════════════════════════════════════════════

// ── Portada Plan ──────────────────────────────────────────
function _portada(doc, perfil, ancho, y) {
  // Fondo superior
  doc.setFillColor(...C.verde);
  doc.rect(0, 0, ancho, 80, 'F');

  // Logo texto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...C.blanco);
  doc.text('Ready', 20, 30);
  doc.setTextColor(...C.naranja);
  doc.text('Balance', 52, 30);

  doc.setFontSize(11);
  doc.setTextColor(...C.blanco);
  doc.setFont('helvetica', 'normal');
  doc.text('Plan Nutricional Personalizado', 20, 40);

  // Nombre del usuario
  const nombre = perfil.nombre ?? 'Usuario';
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.blanco);
  doc.text(nombre, 20, 58);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${_fechaHumana()}`, 20, 68);

  y = 95;

  // Cards de métricas principales
  const macros = perfil.macros ?? {};
  const imc    = perfil.imc    ?? {};

  const cards = [
    { label: 'Calorías',  valor: macros.calorias ?? '—', unidad: 'kcal' },
    { label: 'Proteína',  valor: macros.proteina ?? '—', unidad: 'g' },
    { label: 'Carbos',    valor: macros.carbohidratos ?? '—', unidad: 'g' },
    { label: 'Grasas',    valor: macros.grasas ?? '—', unidad: 'g' },
    { label: 'IMC',       valor: imc.imc ?? '—', unidad: imc.clasificacion?.slice(0,8) ?? '' },
    { label: 'TMB',       valor: perfil.tmb ? Math.round(perfil.tmb) : '—', unidad: 'kcal' }
  ];

  const cw = (ancho - 40) / 3;
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = 20 + col * cw;
    const cy  = y + row * 28;

    doc.setFillColor(...C.fondo);
    doc.roundedRect(x, cy, cw - 4, 24, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.verde);
    doc.text(String(c.valor), x + (cw - 4) / 2, cy + 11, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(...C.gris);
    doc.setFont('helvetica', 'normal');
    doc.text(`${c.label} ${c.unidad}`, x + (cw - 4) / 2, cy + 19, { align: 'center' });
  });

  y += 62;

  // Info personal
  y = _seccionTitulo(doc, 'Datos Personales', 20, y, ancho);
  const datos = [
    ['Género',    _capitalizar(perfil.genero    ?? '—')],
    ['Edad',      perfil.edad     ? perfil.edad     + ' años' : '—'],
    ['Peso',      perfil.peso     ? perfil.peso     + ' kg'   : '—'],
    ['Estatura',  perfil.estatura ? perfil.estatura + ' cm'   : '—'],
    ['Objetivo',  _labelObjetivo(perfil.objetivo)],
    ['Actividad', _labelActividad(perfil.actividad)]
  ];
  y = _tablaDoble(doc, datos, 20, y, ancho);
  return y;
}

// ── Portada Progreso ──────────────────────────────────────
function _portadaProgreso(doc, perfil, ancho, y) {
  doc.setFillColor(...C.oscuro);
  doc.rect(0, 0, ancho, 80, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...C.blanco);
  doc.text('Ready', 20, 30);
  doc.setTextColor(...C.naranja);
  doc.text('Balance', 52, 30);

  doc.setFontSize(11);
  doc.setTextColor(...C.blanco);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte de Progreso Semanal', 20, 40);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.blanco);
  doc.text(perfil.nombre ?? 'Usuario', 20, 58);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${_fechaHumana()}`, 20, 68);

  return 95;
}

// ── Resumen Nutricional ───────────────────────────────────
function _resumenNutricional(doc, perfil, ancho, y) {
  y = _seccionTitulo(doc, 'Resumen Nutricional', 20, y, ancho);

  const macros = perfil.macros ?? {};
  const rows   = [
    ['Calorías objetivo',    `${macros.calorias ?? '—'} kcal/día`],
    ['Proteína',             `${macros.proteina ?? '—'} g/día`],
    ['Carbohidratos',        `${macros.carbohidratos ?? '—'} g/día`],
    ['Grasas',               `${macros.grasas ?? '—'} g/día`],
    ['TMB (Mifflin-St Jeor)',`${perfil.tmb ? Math.round(perfil.tmb) : '—'} kcal`],
    ['TDEE',                 `${perfil.tdee ?? '—'} kcal`],
    ['IMC',                  `${perfil.imc?.imc ?? '—'} — ${perfil.imc?.clasificacion ?? ''}`],
    ['Déficit / Superávit',  _deltaCalories(perfil)]
  ];
  y = _tablaDoble(doc, rows, 20, y, ancho);

  // Barras de macros visuales
  y += 8;
  y = _seccionTitulo(doc, 'Distribución de Macronutrientes', 20, y, ancho);
  const total = (macros.proteina ?? 0) * 4 + (macros.carbohidratos ?? 0) * 4 + (macros.grasas ?? 0) * 9;

  const barData = [
    { label: 'Proteína',       valor: macros.proteina ?? 0,      factor: 4, color: C.verde   },
    { label: 'Carbohidratos',  valor: macros.carbohidratos ?? 0, factor: 4, color: C.naranja },
    { label: 'Grasas',         valor: macros.grasas ?? 0,        factor: 9, color: [127,140,141] }
  ];

  barData.forEach(b => {
    const kcal = b.valor * b.factor;
    const pct  = total > 0 ? Math.round((kcal / total) * 100) : 0;
    const bw   = (ancho - 80) * pct / 100;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.oscuro);
    doc.text(`${b.label}`, 20, y + 5);
    doc.text(`${pct}%`, ancho - 20, y + 5, { align: 'right' });

    doc.setFillColor(...C.grisClaoro);
    doc.roundedRect(60, y, ancho - 80, 6, 2, 2, 'F');
    if (bw > 0) {
      doc.setFillColor(...b.color);
      doc.roundedRect(60, y, bw, 6, 2, 2, 'F');
    }
    y += 12;
  });

  return y;
}

// ── Plan Alimenticio ──────────────────────────────────────
function _planAlimenticio(doc, perfil, ancho, y) {
  y = _seccionTitulo(doc, 'Plan Alimenticio', 20, y, ancho);

  const comidas = perfil.comidas ?? [];
  if (!comidas.length) {
    doc.setFontSize(10);
    doc.setTextColor(...C.gris);
    doc.text('Sin plan generado.', 20, y + 6);
    return y + 20;
  }

  comidas.forEach(comida => {
    // Salto de página si queda poco espacio
    if (y > 230) { doc.addPage(); y = 15; }

    // Header de comida
    doc.setFillColor(...C.verdeOsc);
    doc.roundedRect(20, y, ancho - 40, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.blanco);
    doc.text(comida.nombre, 26, y + 7);
    doc.text(`${comida.calorias ?? 0} kcal`, ancho - 24, y + 7, { align: 'right' });
    y += 14;

    // Items
    const items = comida.items ?? [];
    if (!items.length) {
      doc.setFontSize(9);
      doc.setTextColor(...C.gris);
      doc.text('Sin alimentos asignados.', 26, y + 4);
      y += 10;
    } else {
      // Encabezado de tabla
      _tablaHeaderSimple(doc, ['Alimento', 'Gramos', 'Kcal', 'P (g)', 'C (g)', 'G (g)'],
        [20, 90, 120, 145, 163, 181], y, ancho);
      y += 8;

      items.forEach((item, idx) => {
        if (y > 265) { doc.addPage(); y = 15; }
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 250 : 255);
        doc.rect(20, y - 1, ancho - 40, 7, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.oscuro);
        doc.text(_truncar(item.nombre, 32), 22, y + 4.5);
        doc.text(`${item.gramos} ${item.unidad}`,       91, y + 4.5);
        doc.text(`${item.macros?.calorias ?? 0}`,       121, y + 4.5);
        doc.text(`${item.macros?.proteina ?? 0}`,       146, y + 4.5);
        doc.text(`${item.macros?.carbohidratos ?? 0}`,  164, y + 4.5);
        doc.text(`${item.macros?.grasas ?? 0}`,         182, y + 4.5);
        y += 7;
      });
    }

    // Totales reales de la comida
    const tot = comida.totalesReales;
    if (tot) {
      doc.setFillColor(...C.fondo);
      doc.rect(20, y, ancho - 40, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.verde);
      doc.text(`Total real → ${tot.calorias} kcal | P: ${tot.proteina}g | C: ${tot.carbohidratos}g | G: ${tot.grasas}g`,
        22, y + 5.5);
      y += 10;
    }
    y += 4;
  });
  return y;
}

// ── Lista de Compra ───────────────────────────────────────
function _listaCompra(doc, perfil, ancho, y) {
  y = _seccionTitulo(doc, 'Lista de Compra (7 días)', 20, y, ancho);

  // Importar calcularListaCompra en tiempo de ejecución (está en el módulo nutrition.js)
  // Aquí recibimos los datos ya calculados desde main.js al llamar generarReportePlan
  const lista = perfil._listaCompra ?? [];

  if (!lista.length) {
    doc.setFontSize(10);
    doc.setTextColor(...C.gris);
    doc.text('Sin datos de compra disponibles.', 20, y + 6);
    return y + 20;
  }

  _tablaHeaderSimple(doc, ['Alimento', 'Cantidad para la semana', 'Unidad'],
    [20, 110, 165], y, ancho);
  y += 8;

  lista.forEach((item, idx) => {
    if (y > 265) { doc.addPage(); y = 15; }
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 250 : 255);
    doc.rect(20, y - 1, ancho - 40, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.oscuro);
    doc.text(_truncar(item.nombre, 40), 22, y + 4.5);
    doc.text(`${item.gramosCompra}`, 111, y + 4.5);
    doc.text(item.unidad, 166, y + 4.5);
    y += 7;
  });
  return y + 10;
}

// ── Resumen Semana (Progreso) ─────────────────────────────
function _resumenSemana(doc, perfil, stats, ancho, y) {
  y = _seccionTitulo(doc, 'Estadísticas de la Semana', 20, y, ancho);

  const macros = perfil.macros ?? {};
  const rows   = [
    ['Días registrados',   `${stats.diasRegistrados} de 7`],
    ['Cumplimiento calórico', `${stats.cumplimiento}%`],
    ['Prom. calorías/día', `${stats.promCalorias || '—'} kcal`],
    ['Meta calórica',      `${macros.calorias ?? '—'} kcal/día`],
    ['Peso actual',        stats.pesoActual  ? stats.pesoActual  + ' kg' : 'Sin registro'],
    ['Peso inicial (semana)', stats.pesoInicial ? stats.pesoInicial + ' kg' : 'Sin registro'],
    ['Tendencia de peso',  stats.tendenciaPeso !== null
      ? (stats.tendenciaPeso > 0 ? '+' : '') + stats.tendenciaPeso + ' kg'
      : 'Insuficiente datos']
  ];
  y = _tablaDoble(doc, rows, 20, y, ancho);
  return y;
}

// ── Tabla Diaria (Progreso) ───────────────────────────────
function _tablaDiaria(doc, stats, ancho, y) {
  y = _seccionTitulo(doc, 'Registro Diario', 20, y, ancho);

  _tablaHeaderSimple(doc,
    ['Día', 'Calorías', 'Proteína (g)', 'Carbos (g)', 'Grasas (g)', 'Peso (kg)', 'Comidas ✓'],
    [20, 55, 85, 120, 150, 175, 193], y, ancho);
  y += 8;

  stats.filas.forEach((fila, idx) => {
    if (y > 265) { doc.addPage(); y = 15; }
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 250 : 255);
    doc.rect(20, y - 1, ancho - 40, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.oscuro);
    doc.text(fila.etiqueta,              22, y + 4.5);
    doc.text(`${fila.calorias || '—'}`,  56, y + 4.5);
    doc.text(`${fila.proteina || '—'}`,  86, y + 4.5);
    doc.text(`${fila.carbohidratos || '—'}`, 121, y + 4.5);
    doc.text(`${fila.grasas || '—'}`,    151, y + 4.5);
    doc.text(fila.peso ? String(fila.peso) : '—', 176, y + 4.5);
    doc.text(`${fila.completadas}`,      194, y + 4.5);
    y += 7;
  });
  return y + 10;
}

// ── Pie de página ─────────────────────────────────────────
function _pie(doc, ancho) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.verde);
    doc.rect(0, 285, ancho, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.blanco);
    doc.text('Ready Balance — Nutrición de Precisión', 20, 292);
    doc.text(`Página ${i} de ${total}`, ancho - 20, 292, { align: 'right' });
  }
}

// ══════════════════════════════════════════════════════════
// HELPERS DE LAYOUT
// ══════════════════════════════════════════════════════════

function _seccionTitulo(doc, titulo, x, y, ancho) {
  doc.setFillColor(...C.verde);
  doc.rect(x, y, ancho - 40, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.verdeOsc);
  doc.text(titulo, x, y - 3);
  return y + 8;
}

function _tablaDoble(doc, rows, x, y, ancho) {
  const col1w = 65;
  rows.forEach(([ label, valor ], idx) => {
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 250 : 255);
    doc.rect(x, y, ancho - 40, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.gris);
    doc.text(label, x + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.oscuro);
    doc.text(String(valor), x + col1w, y + 5);
    y += 7;
  });
  return y + 5;
}

function _tablaHeaderSimple(doc, cols, xs, y, ancho) {
  doc.setFillColor(...C.oscuro);
  doc.rect(20, y, ancho - 40, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.blanco);
  cols.forEach((col, i) => doc.text(col, xs[i] + 2, y + 5));
}

// ── Utilidades ────────────────────────────────────────────
function _fechaHoy() {
  return new Date().toISOString().split('T')[0];
}

function _fechaHumana() {
  return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function _capitalizar(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function _truncar(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : (str ?? '');
}

function _deltaCalories(perfil) {
  if (!perfil.tdee || !perfil.macros?.calorias) return '—';
  const delta = perfil.macros.calorias - perfil.tdee;
  return (delta > 0 ? '+' : '') + delta + ' kcal/día';
}

function _labelObjetivo(clave) {
  return {
    perdida_rapida:    'Pérdida rápida',
    perdida_moderada:  'Pérdida moderada',
    mantenimiento:     'Mantenimiento',
    ganancia_limpia:   'Ganancia limpia',
    volumen:           'Volumen'
  }[clave] ?? clave ?? '—';
}

function _labelActividad(clave) {
  return {
    sedentario:  'Sedentario',
    ligero:      'Ligero (1-3 días)',
    moderado:    'Moderado (3-5 días)',
    activo:      'Activo (6-7 días)',
    muy_activo:  'Muy activo'
  }[clave] ?? clave ?? '—';
}