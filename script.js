// Inicialización de Firebase y variables globales
const db = firebase.database();
const reparacionesRef = db.ref('reparaciones');
let reparaciones = [];

// Escuchar cambios en tiempo real de Firebase
reparacionesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        reparaciones = Object.values(data);
        actualizarTablaReparaciones();
    } else {
        reparaciones = [];
        limpiarTabla();
    }
});

// Funciones de la interfaz
function limpiarTabla() {
    document.querySelector('.reparaciones-container tbody').innerHTML = '';
}

function actualizarTablaReparaciones() {
    const tbody = document.querySelector('.reparaciones-container tbody');
    tbody.innerHTML = '';

    reparaciones.forEach(reparacion => {
        const nuevaFila = crearFilaReparacion(reparacion);
        tbody.appendChild(nuevaFila);
        aplicarEstilosYEventos(nuevaFila, reparacion);
    });
}

function crearFilaReparacion(reparacion) {
    const nuevaFila = document.createElement('tr');
    nuevaFila.innerHTML = `
        <td>${reparacion.nombre}</td>
        <td>${reparacion.numeroMaquina}</td>
        <td>
            <select onchange="cambiarColorFila(this)">
                <option value="alta" ${reparacion.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                <option value="media" ${reparacion.prioridad === 'media' ? 'selected' : ''}>Media</option>
                <option value="baja" ${reparacion.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
            </select>
        </td>
        <td>
            <div class="status-container">
                <span class="status-circle" id="status-circle-${reparacion.nombre}"></span>
                <select onchange="actualizarStatus(this)">
                    <option value="en_reparacion" ${reparacion.status === 'en_reparacion' ? 'selected' : ''}>En reparación</option>
                    <option value="funcionando" ${reparacion.status === 'funcionando' ? 'selected' : ''}>Funcionando</option>
                    <option value="detenido" ${reparacion.status === 'detenido' ? 'selected' : ''}>Detenido</option>
                </select>
            </div>
        </td>
        <td>
            <button onclick="verImagen('${reparacion.nombre}', '${reparacion.imagen}', '${reparacion.descripcion}')">Abrir</button>
        </td>
        <td>${reparacion.fechaHoraIngreso}</td>
    `;
    return nuevaFila;
}

function aplicarEstilosYEventos(fila, reparacion) {
    const prioridadSelect = fila.querySelector('select[onchange*="cambiarColorFila"]');
    const statusSelect = fila.querySelector('select[onchange*="actualizarStatus"]');
    
    cambiarColorFila(prioridadSelect);
    actualizarColorCirculo(statusSelect);

    if (reparacion.status === 'detenido' && reparacion.prioridad === 'alta') {
        fila.classList.add('tr-intermitente');
        iniciarIntermitente(fila);
    }
}

// Funciones de manejo de eventos
function cambiarColorFila(select) {
    const fila = select.closest('tr');
    const statusSelect = fila.querySelector('select[onchange*="actualizarStatus"]');
    
    fila.classList.remove('alta', 'media', 'baja');
    
    if (statusSelect.value === 'funcionando') {
        fila.style.backgroundColor = 'white';
        fila.style.color = '#333';
        return;
    }

    const prioridad = select.value;
    if (prioridad) {
        fila.classList.add(prioridad);
    }

    actualizarReparacionEnFirebase(fila);
}

function actualizarStatus(select) {
    const fila = select.closest('tr');
    const prioridadSelect = fila.querySelector('select[onchange*="cambiarColorFila"]');
    
    if (select.value === 'funcionando') {
        fila.style.backgroundColor = 'white';
        fila.style.color = '#333';
        fila.classList.remove('alta', 'media', 'baja');
    } else {
        cambiarColorFila(prioridadSelect);
    }

    actualizarColorCirculo(select);
    actualizarReparacionEnFirebase(fila);
}

function actualizarColorCirculo(select) {
    const statusCircle = select.closest('.status-container').querySelector('.status-circle');
    const colores = {
        'funcionando': 'green',
        'en_reparacion': 'orange',
        'detenido': 'red'
    };
    statusCircle.style.backgroundColor = colores[select.value] || 'gray';
}

// Funciones de Firebase
function actualizarReparacionEnFirebase(fila) {
    const index = Array.from(fila.parentNode.children).indexOf(fila);
    if (index === -1) return;

    const prioridadSelect = fila.querySelector('select[onchange*="cambiarColorFila"]');
    const statusSelect = fila.querySelector('select[onchange*="actualizarStatus"]');
    const reparacionKey = Object.keys(reparacionesRef)[index];

    reparacionesRef.child(reparacionKey).update({
        prioridad: prioridadSelect.value,
        status: statusSelect.value
    });
}

function agregarReparacion(nombre, numeroMaquina, prioridad, status, imagen, descripcion) {
    const nuevaReparacion = {
        nombre,
        numeroMaquina,
        prioridad,
        status,
        imagen,
        descripcion,
        fechaHoraIngreso: new Date().toLocaleString()
    };

    reparacionesRef.push(nuevaReparacion)
        .then(() => {
            console.log('Reparación guardada exitosamente');
            enviarCorreoNuevaReparacion(nuevaReparacion);
            exportarJSON();
            cerrarFormulario();
        })
        .catch(error => {
            console.error('Error al guardar:', error);
            alert('Error al guardar la reparación');
        });
}

// Event Listeners
document.getElementById("form-reparacion").addEventListener("submit", function(event) {
    event.preventDefault();
    
    const formData = {
        nombre: document.getElementById("nombre").value,
        numeroMaquina: document.getElementById("numeroMaquina").value,
        prioridad: document.getElementById("prioridad").value,
        status: document.getElementById("status").value,
        descripcion: document.getElementById("descripcion").value,
        imagenInput: document.getElementById("imagen")
    };

    if (formData.imagenInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            agregarReparacion(
                formData.nombre,
                formData.numeroMaquina,
                formData.prioridad,
                formData.status,
                e.target.result,
                formData.descripcion
            );
        };
        reader.readAsDataURL(formData.imagenInput.files[0]);
    } else {
        alert("Por favor, seleccione una imagen.");
    }
});

// Funciones de utilidad
function abrirFormulario() {
    document.getElementById("formulario").style.display = "block";
}

function cerrarFormulario() {
    document.getElementById("formulario").style.display = "none";
    document.getElementById("form-reparacion").reset();
}

function verImagen(nombre, imagen, descripcion) {
    document.getElementById("imagenReparacion").src = imagen;
    document.getElementById("descripcionReparacion").innerText = descripcion;
    document.getElementById("ventanaEmergente").style.display = "block";
}

function cerrarVentanaEmergente() {
    document.getElementById("ventanaEmergente").style.display = "none";
}

function resetearLista() {
    const usuario = prompt("Ingrese el usuario:");
    const contrasena = prompt("Ingrese la contraseña:");

    if (usuario === "admin" && contrasena === "admin1234") {
        reparacionesRef.remove()
            .then(() => alert("La lista ha sido reseteada."))
            .catch(error => {
                console.error('Error al resetear:', error);
                alert('Error al resetear la lista');
            });
    } else {
        alert("Usuario o contraseña incorrectos.");
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // La inicialización ahora se maneja a través del listener de Firebase
});

function exportarJSON() {
    try {
        // Crear una copia limpia de los datos
        const datosParaExportar = reparaciones.map(rep => {
            return {
                nombre: rep.nombre,
                numeroMaquina: rep.numeroMaquina,
                prioridad: rep.prioridad,
                status: rep.status,
                descripcion: rep.descripcion,
                fechaHoraIngreso: rep.fechaHoraIngreso
            };
        });

        // Convertir a JSON con formato legible
        const jsonString = JSON.stringify(datosParaExportar, null, 2);
        
        // Crear blob y URL
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        // Crear elemento de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `reparaciones_${new Date().toISOString().split('T')[0]}.json`;
        
        // Simular click y limpiar
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('Archivo JSON generado exitosamente');
    } catch (error) {
        console.error('Error al generar JSON:', error);
        alert('Error al generar el archivo JSON');
    }
}

function cargarJSON(evento) {
    const archivo = evento.target.files[0];
    if (archivo) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const datos = JSON.parse(e.target.result);
                datos.forEach(reparacion => {
                    reparacionesRef.push(reparacion);
                });
                alert('Datos JSON importados correctamente');
            } catch (error) {
                console.error('Error al cargar JSON:', error);
                alert('Error al cargar el archivo JSON');
            }
        };
        reader.readAsText(archivo);
    }
}

const inputJSON = document.createElement('input');
inputJSON.type = 'file';
inputJSON.accept = '.json';
inputJSON.style.display = 'none';
inputJSON.addEventListener('change', cargarJSON);
document.body.appendChild(inputJSON);

function cargarArchivoJSON() {
    inputJSON.click();
}
