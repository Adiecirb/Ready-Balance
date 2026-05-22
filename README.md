# NutriPrecision — Plataforma Logística de Nutrición de Precisión

> Proyecto · Materia: Desarrollo de Aplicaciones Web  
> Tipo: SaaS · Stack: HTML5 · CSS3 · JavaScript Vanilla


## Descripción

**NutriPrecision** es una plataforma web SaaS (Software as a Service) Plataforma Logística de Nutrición de Precisión. Automatiza el proceso de creación de planes alimenticios personalizados, calcula gramajes exactos de macronutrientes y genera reportes administrativos de mermas, inventario e insumos necesarios para objetivos especificos.

### ¿Qué problema resuelve?

Actualmente los nutriólogos hacen estos cálculos a mano o en hojas de Excel, lo que genera:
-  Errores de cálculo en gramajes
-  Pérdida de tiempo en planificación
-  Dificultad para escalar el servicio
-  Sin reportes administrativos automatizados

**NutriPrecision** resuelve todo esto con una interfaz web moderna y cálculos automatizados.

---

## Integrantes del Equipo

| Persona | Responsabilidades |
|---------|-------------------|
| **Jose** | Frontend: HTML, CSS, diseño del dashboard, componentes UI |
| **Briceida** | Lógica: JavaScript (config.js, cache.js, utils.js, main.js), JSON |

---

## Tecnologías Utilizadas

| Tecnología | Uso |
|-----------|-----|
| HTML5 | Estructura semántica de la interfaz |
| CSS3 | Diseño responsive con Grid y Flexbox |
| JavaScript ES2022 | Lógica de negocio, DOM, eventos |
| Fetch API | Carga asíncrona de datos JSON |
| LocalStorage | Sistema de caché del navegador |
| JSON | Almacenamiento de datos estructurados |


##  Estructura del Proyecto

```
nutricion-precision/
│
├── index.html              ← Página principal (dashboard)
│
├── css/
│   └── styles.css          ← Estilos del dashboard (Grid, Flexbox, Variables)
│
├── js/
│   ├── config.js           ← Configuración global + fetch() de datos JSON
│   ├── cache.js            ← Sistema de caché (LocalStorage/SessionStorage)
│   ├── utils.js            ← Funciones de cálculo: macros, mermas, fechas
│   └── main.js             ← Cerebro: DOM, eventos, renderizado dinámico
│
├── data/
│   ├── foods.json          ← Catálogo de 15 alimentos con macros y mermas
│   ├── users.json          ← 5 perfiles de usuarios con objetivos
│   └── plans.json          ← 4 planes alimenticios completos
│
├── docs/                   ← Documentación del proyecto
│
├── .gitignore
└── README.md
```



## Licencia

Proyecto académico — Universidad · 2026  
