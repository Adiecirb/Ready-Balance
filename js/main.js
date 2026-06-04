console.log("App started");
import { loadFoods } from './config.js';
import { calculateCalories } from './utils.js';

// ==========================================
        // 1. LÓGICA DEL CARRUSEL DE EXPERIENCIAS
        // ==========================================
        const slides = document.querySelectorAll('.slide-experiencia');
        const puntos = document.querySelectorAll('.punto');
        let slideActual = 0;

        // Función para cambiar de diapositiva
        function mostrarSlide(indice) {
            // Quitar la clase 'activo' a todos los slides y puntos
            slides.forEach(slide => slide.classList.remove('activo'));
            puntos.forEach(punto => punto.classList.remove('activo'));

            // Asignar la clase 'activo' solo al que corresponde
            slideActual = indice;
            slides[slideActual].classList.add('activo');
            puntos[slideActual].classList.add('activo');
        }

        // Función para avanzar automáticamente
        function siguienteSlide() {
            let nuevoIndice = slideActual + 1;
            // Si llega al final, regresa a la primera diapositiva (0)
            if (nuevoIndice >= slides.length) {
                nuevoIndice = 0; 
            }
            mostrarSlide(nuevoIndice);
        }

        // Cambiar automáticamente cada 5 segundos (5000 milisegundos)
        setInterval(siguienteSlide, 5000);

        // Hacer que los usuarios puedan hacer clic en los puntos
        puntos.forEach((punto, index) => {
            punto.addEventListener('click', () => {
                mostrarSlide(index);
            });
        });

        // ==========================================
        // 2. LÓGICA PARA ABRIR Y CERRAR EL CUESTIONARIO
        // ==========================================
        const btnStartNow = document.getElementById('btn-abrir-cuestionario');
        const vistaCuestionario = document.getElementById('vista-cuestionario');
        const btnCerrar = document.getElementById('btn-cerrar-cuestionario');

        // Abrir cuestionario
        if(btnStartNow && vistaCuestionario) {
            btnStartNow.addEventListener('click', () => {
                vistaCuestionario.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Oculta el scroll del fondo
            });
        }

        // Cerrar cuestionario
        if(btnCerrar) {
            btnCerrar.addEventListener('click', () => {
                vistaCuestionario.style.display = 'none';
                document.body.style.overflow = 'auto'; // Devuelve el scroll al fondo
            });
        }

        // ==========================================
        // 3. LÓGICA DE NAVEGACIÓN DENTRO DEL CUESTIONARIO
        // ==========================================
        const pasosCuestionario = Array.from(document.querySelectorAll('.paso-cuestionario'));
        let pasoActualCuestionario = 0;

        // Función maestra para cambiar de pantalla en el cuestionario
        function irAPasoCuestionario(indice) {
            pasosCuestionario.forEach(paso => paso.classList.remove('activo'));
            pasoActualCuestionario = indice;
            pasosCuestionario[pasoActualCuestionario].classList.add('activo');
        }

        // Botones de opción (ej. Paso 1: "Pérdida de peso")
        // Botones de opción (ej. Paso 1: "Pérdida de peso")
        const opcionesBienvenida = document.querySelectorAll('#q-bienvenida .btn-opcion');
        const tituloMetaRitmo = document.getElementById('titulo-meta-ritmo'); // Buscamos el título de la otra pantalla

        opcionesBienvenida.forEach(boton => {
            boton.addEventListener('click', function() {
                // 1. Quitar la selección a todos y marcar el actual
                opcionesBienvenida.forEach(b => b.classList.remove('seleccionado'));
                this.classList.add('seleccionado');

                // 2. Leer qué botón presionó el usuario
                const opcionTexto = this.innerText.trim();

                // 3. Crear el mensaje personalizado según la opción
                let mensajePersonalizado = "";
                
                if (opcionTexto === "Pérdida de peso") {
                    mensajePersonalizado = "¡Así que estás aquí para perder peso!";
                } else if (opcionTexto === "Ganar músculo y perder grasa") {
                    mensajePersonalizado = "¡Así que estás aquí para ganar músculo y perder grasa!";
                } else if (opcionTexto === "Ganar músculo, perder grasa es secundario") {
                    mensajePersonalizado = "¡Así que tu prioridad es ganar masa muscular a tope!";
                } else if (opcionTexto === "Comer más sano sin perder peso") {
                    mensajePersonalizado = "¡Así que estás aquí para comer más sano y mantenerte!";
                }

                // 4. Inyectar ese nuevo mensaje en la pantalla de "Meta y Ritmo"
                if (tituloMetaRitmo) {
                    tituloMetaRitmo.innerText = mensajePersonalizado;
                }
            });
        });

        // Botones de "Siguiente / Continuar"
        const botonesSiguiente = document.querySelectorAll('.btn-siguiente-oscuro');
        botonesSiguiente.forEach(boton => {
            boton.addEventListener('click', () => {
                if(pasoActualCuestionario < pasosCuestionario.length - 1) {
                    irAPasoCuestionario(pasoActualCuestionario + 1);
                }
            });
        });

        // Botones de "Atrás"
        const botonesAtras = document.querySelectorAll('.btn-atras');
        botonesAtras.forEach(boton => {
            boton.addEventListener('click', () => {
                if(pasoActualCuestionario > 0) {
                    irAPasoCuestionario(pasoActualCuestionario - 1);
                }
            });
        });

        // ==========================================
        // 4. LÓGICA DE LA PANTALLA DE REGISTRO (UI)
        // ==========================================

        // A. Lógica para mostrar/ocultar contraseña
        const btnTogglePass = document.getElementById('btn-toggle-pass');
        const inputPass = document.getElementById('reg-pass');

        if(btnTogglePass && inputPass) {
            btnTogglePass.addEventListener('click', () => {
                // Si está como texto oculto (password), cámbialo a texto visible
                if (inputPass.type === 'password') {
                    inputPass.type = 'text';
                    // Opcional: Podrías cambiar el color del icono aquí para indicar que está visible
                } else {
                    inputPass.type = 'password';
                }
            });
        }

        // B. Simulación del Botón de Registro 
        const btnRegistrate = document.getElementById('btn-registrate');
        
        if(btnRegistrate) {
            btnRegistrate.addEventListener('click', () => {
                const correoInput = document.getElementById('reg-correo').value;
                
                // --- AQUÍ EMPIEZA LA TAREA DE PERSONA 2 ---
                // Simulación: Si el correo es "test@test.com", fingimos que ya existe
                if(correoInput === 'test@test.com') {
                    alert("Este correo ya está registrado. Por favor, inicia sesión.");
                    // Aquí Persona 2 pondrá el código para redirigir a la vista de Iniciar Sesión
                } else {
                    // Si es un correo nuevo, pasamos al siguiente paso del cuestionario
                    if(pasoActualCuestionario < pasosCuestionario.length - 1) {
                        irAPasoCuestionario(pasoActualCuestionario + 1);
                    }
                }
                // --- AQUÍ TERMINA LA TAREA DE PERSONA 2 ---
            });
        }

        // ==========================================
        // 5. LÓGICA DE REVELACIÓN PROGRESIVA (Vamos a conocerte)
        // ==========================================

        const botonesGenero = document.querySelectorAll('#bloque-genero .btn-pildora');
        const bloqueEdad = document.getElementById('bloque-edad');
        const inputEdad = document.getElementById('input-edad');
        const bloquePeso = document.getElementById('bloque-peso');
        const inputPeso = document.getElementById('input-peso');
        const bloqueEstatura = document.getElementById('bloque-estatura');
        const inputEstatura = document.getElementById('input-estatura');
        const btnSiguienteConocer = document.getElementById('btn-siguiente-conocer');

        // Al seleccionar género, mostramos la edad
        botonesGenero.forEach(boton => {
            boton.addEventListener('click', function() {
                // Quitamos la selección anterior y marcamos el actual
                botonesGenero.forEach(b => b.classList.remove('seleccionado'));
                this.classList.add('seleccionado');
                
                // Revelamos la siguiente pregunta
                if(bloqueEdad) {
                    bloqueEdad.classList.remove('oculto');
                    bloqueEdad.classList.add('visible');
                }
            });
        });

        // Al escribir la edad, mostramos el peso
        if(inputEdad) {
            inputEdad.addEventListener('input', function() {
                if(this.value.length > 0) {
                    bloquePeso.classList.remove('oculto');
                    bloquePeso.classList.add('visible');
                }
            });
        }

        // Al escribir el peso, mostramos la estatura
        if(inputPeso) {
            inputPeso.addEventListener('input', function() {
                if(this.value.length > 0) {
                    bloqueEstatura.classList.remove('oculto');
                    bloqueEstatura.classList.add('visible');
                }
            });
        }

        // Al escribir la estatura, se muestra el botón Siguiente
        if(inputEstatura) {
            inputEstatura.addEventListener('input', function() {
                if(this.value.length > 0) {
                    btnSiguienteConocer.classList.remove('oculto');
                    btnSiguienteConocer.classList.add('visible');
                } else {
                    // Si borra la estatura, volvemos a ocultar el botón
                    btnSiguienteConocer.classList.remove('visible');
                    btnSiguienteConocer.classList.add('oculto');
                }
            });
        }

        // ==========================================
        // 6. LÓGICA DE INTERFAZ: SLIDER DE RITMO
        // ==========================================
        
        const sliderRitmo = document.getElementById('slider-ritmo');
        const iconosRitmo = document.querySelectorAll('.icono-ritmo');

        if(sliderRitmo) {
            // Esta función pinta la barra y enciende los íconos
            const actualizarSlider = () => {
                const valor = parseInt(sliderRitmo.value); // Será 1, 2 o 3
                
                // 1. Pintar la barra con un gradiente (Naranja a la izquierda, Gris a la derecha)
                // Usamos matemáticas simples para saber el porcentaje: (valor - min) / (max - min) * 100
                const porcentaje = ((valor - 1) / (3 - 1)) * 100;
                sliderRitmo.style.background = `linear-gradient(to right, #F09A59 ${porcentaje}%, #EEEEEE ${porcentaje}%)`;

                // 2. Apagar todos los iconos y encender solo el seleccionado
                iconosRitmo.forEach((icono, index) => {
                    // Restamos 1 porque el valor empieza en 1, pero los index en JavaScript empiezan en 0
                    if(index === (valor - 1)) {
                        icono.classList.add('activo');
                    } else {
                        icono.classList.remove('activo');
                    }
                });
            };

            // Que se ejecute cada vez que el usuario desliza la barra
            sliderRitmo.addEventListener('input', actualizarSlider);
            
            // Que se ejecute una vez al cargar la página para que inicie pintado en el centro
            actualizarSlider(); 
        }

        // ==========================================
        // 7. LÓGICA DE INTERFAZ: BOTONES SÍ / NO Y CONDICIONAL
        // ==========================================
        
        const opcionesRestricciones = document.querySelectorAll('#q-restricciones .btn-opcion-mitad');
        const cajaAlergia = document.getElementById('caja-alergia');
        const inputAlergia = document.getElementById('input-alergia');
        
        opcionesRestricciones.forEach(boton => {
            boton.addEventListener('click', function() {
                // Quitar la selección a ambos y marcar el presionado
                opcionesRestricciones.forEach(b => b.classList.remove('seleccionado'));
                this.classList.add('seleccionado');

                // Lógica condicional para revelar la pregunta
                if (this.innerText.trim() === 'Sí') {
                    // Si elige Sí, revelamos la caja con nuestra animación
                    cajaAlergia.classList.remove('oculto');
                    cajaAlergia.classList.add('visible');
                } else {
                    // Si elige No, la volvemos a ocultar
                    cajaAlergia.classList.remove('visible');
                    cajaAlergia.classList.add('oculto');
                    
                    // Detalle de calidad: Limpiamos la caja por si había escrito algo y luego se arrepintió
                    if(inputAlergia) inputAlergia.value = ''; 
                }
            });
        });

        // ==========================================
        // 8. LÓGICA DE INTERFAZ: TARJETAS DE COMIDAS
        // ==========================================
        
        const tarjetasComidas = document.querySelectorAll('#q-comidas .btn-tarjeta-comida');
        
        tarjetasComidas.forEach(tarjeta => {
            tarjeta.addEventListener('click', function() {
                // Quitar la selección a todas las tarjetas
                tarjetasComidas.forEach(t => t.classList.remove('seleccionado'));
                
                // Aplicar la selección únicamente a la tarjeta clickeada
                this.classList.add('seleccionado');
            });
        });

        // ==========================================
        // 9. LÓGICA DE INTERFAZ: ACTIVIDAD Y ÉXITO
        // ==========================================
        
        // A. Selección para "Actividad Física"
        const opcionesActividad = document.querySelectorAll('#q-actividad .btn-opcion');
        
        opcionesActividad.forEach(boton => {
            boton.addEventListener('click', function() {
                opcionesActividad.forEach(b => b.classList.remove('seleccionado'));
                this.classList.add('seleccionado');
            });
        });

        // B. Selección para "Factor de Éxito"
        const opcionesFactor = document.querySelectorAll('#q-factor .btn-opcion');
        
        opcionesFactor.forEach(boton => {
            boton.addEventListener('click', function() {
                opcionesFactor.forEach(b => b.classList.remove('seleccionado'));
                this.classList.add('seleccionado');
            });
        });

    
        
       // ==========================================
        // 10. SIMULACIÓN DE CARGA FINAL (Dinámico)
        // ==========================================
        
        document.addEventListener('click', function(e) {
            const botonSiguiente = e.target.closest('.btn-siguiente-oscuro');
            
            // Si hicieron clic en un botón "Siguiente" y NO está apagado (gris)
            if (botonSiguiente && !botonSiguiente.disabled) {
                
                const pantallaActual = botonSiguiente.closest('.paso-cuestionario');
                
                // Magia pura: Buscamos cuál es la pantalla que sigue inmediatamente en el HTML
                const siguientePantalla = pantallaActual.nextElementSibling;
                
                // Si la pantalla que sigue resulta ser nuestro spinner de carga...
                if (siguientePantalla && siguientePantalla.id === 'q-cargando') {
                    
                    console.log("Última pantalla detectada. Iniciando simulación de carga...");
                    
                    // Iniciamos el temporizador de 3.5 segundos
                    setTimeout(() => {
                        console.log("Saltando al Dashboard...");
                        window.location.href = './dashboard.html';
                    }, 3500);
                }
            }
        });

        // ==========================================
        // 13. LÓGICA DE INTERFAZ: MENÚ LATERAL
        // ==========================================
        
        const btnMenuLateral = document.getElementById('btn-menu-lateral');
        const btnCerrarMenu = document.getElementById('btn-cerrar-menu');
        const sidebarMenu = document.getElementById('sidebar-menu');
        const overlayMenu = document.getElementById('overlay-menu');

        // Solo ejecutamos esto si estamos en una pantalla que tiene el menú (como el Dashboard)
        if (btnMenuLateral && sidebarMenu) {
            
            // Función para abrir
            btnMenuLateral.addEventListener('click', () => {
                sidebarMenu.classList.add('activo');
                overlayMenu.classList.add('activo');
            });

            // Función para cerrar (con la tachita)
            btnCerrarMenu.addEventListener('click', () => {
                sidebarMenu.classList.remove('activo');
                overlayMenu.classList.remove('activo');
            });

            // Función para cerrar (tocando la pantalla oscura)
            overlayMenu.addEventListener('click', () => {
                sidebarMenu.classList.remove('activo');
                overlayMenu.classList.remove('activo');
            });
        }

        // ==========================================
        // 14. LÓGICA DE INTERFAZ: FILTRADO DE BLOGS
        // ==========================================
        
        const botonesFiltro = document.querySelectorAll('#menu-filtros-blog .nav-link');
        const tarjetasBlog = document.querySelectorAll('.tarjeta-articulo');

        if (botonesFiltro.length > 0 && tarjetasBlog.length > 0) {
            botonesFiltro.forEach(boton => {
                boton.addEventListener('click', function(e) {
                    e.preventDefault(); // Evita que la página salte hacia arriba

                    // 1. Cambiar el color verde (activo) al botón clickeado
                    botonesFiltro.forEach(b => b.classList.remove('activo'));
                    this.classList.add('activo');

                    // 2. Obtener qué categoría queremos ver
                    const filtroSeleccionado = this.getAttribute('data-filtro');

                    // 3. Filtrar las tarjetas
                    tarjetasBlog.forEach(tarjeta => {
                        const categoriaTarjeta = tarjeta.getAttribute('data-categoria');

                        // Si seleccionamos "todos" o si la tarjeta coincide con el filtro
                        if (filtroSeleccionado === 'todos' || filtroSeleccionado === categoriaTarjeta) {
                            tarjeta.style.display = 'block'; // La mostramos
                            
                            // Un pequeño efecto de aparición suave
                            setTimeout(() => {
                                tarjeta.style.opacity = '1';
                                tarjeta.style.transform = 'scale(1)';
                            }, 50);
                        } else {
                            // Ocultamos las que no coinciden
                            tarjeta.style.opacity = '0';
                            tarjeta.style.transform = 'scale(0.8)';
                            
                            // Esperamos a que acabe la animación para quitarla del espacio
                            setTimeout(() => {
                                tarjeta.style.display = 'none';
                            }, 300);
                        }
                    });
                });
            });
            
        }
        // --- NUEVO: Leer el filtro de la URL al cargar la página ---
        // Esto permite que al llegar desde el index.html, se auto-filtre la categoría
        window.addEventListener('DOMContentLoaded', () => {
            // Buscamos si la URL tiene un "?filtro=algo"
            const parametrosURL = new URLSearchParams(window.location.search);
            const filtroSolicitado = parametrosURL.get('filtro');

            if (filtroSolicitado) {
                // Buscamos el botón que coincide con ese filtro
                const botonCorrespondiente = document.querySelector(`#menu-filtros-blog .nav-link[data-filtro="${filtroSolicitado}"]`);
                
                if (botonCorrespondiente) {
                    // Simulamos que el usuario le dio clic mágicamente
                    botonCorrespondiente.click();
                }
            }
        });
