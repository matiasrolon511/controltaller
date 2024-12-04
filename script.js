let reparaciones = JSON.parse(localStorage.getItem('reparaciones')) || [];

// Agregar estas constantes al inicio del archivo
const CLIENT_ID = '123456789-abcdef.apps.googleusercontent.com'; // Reemplaza con tu Client ID
const API_KEY = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXX'; // Reemplaza con tu API Key
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Función para inicializar la API de Google
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    try {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
            callback: '', // definido en subirADrive
    });
    gisInited = true;
    maybeEnableButtons();
    } catch (err) {
        console.error('Error en gisLoaded:', err);
        alert('Error al inicializar Google Identity Services');
    }
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('subirDrive').disabled = false;
    }
}

// Función para subir a Drive
async function subirADrive() {
    try {
        if (!gapi || !gapi.client) {
            console.error('Error: gapi no está inicializado');
            alert('Error al cargar la API de Google. Por favor, recarga la página.');
            return;
        }

        // Verificar si hay un token
        if (!gapi.client.getToken()) {
            console.log('No hay token, solicitando autorización...');
            // Solicitar el token
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    console.error('Error de autorización:', resp);
                    alert('Error de autorización: ' + resp.error);
                    return;
                }
                console.log('Autorización exitosa, creando hoja de cálculo...');
                await crearHojaCalculo();
            };
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            console.log('Token existente, creando hoja de cálculo...');
            await crearHojaCalculo();
        }
    } catch (err) {
        console.error('Error en subirADrive:', err);
        alert('Error al subir a Drive: ' + (err.message || 'Error desconocido'));
    }
}

async function crearHojaCalculo() {
    try {
        // Crear una nueva hoja de cálculo
        const spreadsheet = await gapi.client.sheets.spreadsheets.create({
            properties: {
                title: 'Servicio de Mantenimiento'
            }
        });

        const spreadsheetId = spreadsheet.result.spreadsheetId;

        // Preparar los datos
        const datos = [
            ['Nombre', 'Nº de Máquina', 'Prioridad', 'Status', 'Descripción', 'Fecha y Hora'],
            ...reparaciones.map(r => [
                r.nombre,
                r.numeroMaquina,
                r.prioridad,
                r.status,
                r.descripcion,
                r.fechaHoraIngreso
            ])
        ];

        // Actualizar la hoja con los datos
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: {
                values: datos
            }
        });

        // Dar formato a la hoja
        const requests = [{
            updateSheetProperties: {
                properties: {
                    gridProperties: {
                        frozenRowCount: 1
                    }
                },
                fields: 'gridProperties.frozenRowCount'
            }
        }];

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: { requests }
        });

        alert('Datos subidos exitosamente a Google Drive');
        
        // Abrir la hoja en una nueva pestaña
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    } catch (err) {
        console.error('Error:', err);
        alert('Error al crear la hoja de cálculo: ' + err.message);
    }
}

// Función para abrir el formulario
function abrirFormulario() {
    document.getElementById("formulario").style.display = "block";
}

// Función para cerrar el formulario
function cerrarFormulario() {
    document.getElementById("formulario").style.display = "none";
    // También limpiar el formulario al cerrarlo
    document.getElementById("form-reparacion").reset();
}

// Función para resetear la lista de reparaciones
function resetearLista() {
    const usuario = prompt("Ingrese el usuario:");
    const contrasena = prompt("Ingrese la contraseña:");

    if (usuario === "admin" && contrasena === "admin1234") {
        // Limpiar Firebase
        reparacionesRef.remove()
            .then(() => {
                alert("La lista ha sido reseteada.");
            })
            .catch(error => {
                console.error('Error al resetear:', error);
                alert('Error al resetear la lista');
            });
    } else {
        alert("Usuario o contraseña incorrectos.");
    }
}

// Función para agregar una nueva reparación
document.getElementById("form-reparacion").addEventListener("submit", function(event) {
    event.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const numeroMaquina = document.getElementById("numeroMaquina").value;
    const prioridad = document.getElementById("prioridad").value;
    const status = document.getElementById("status").value;
    const imagenInput = document.getElementById("imagen");
    const descripcion = document.getElementById("descripcion").value;

    if (imagenInput.files.length > 0) {
        const file = imagenInput.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const imagenDataUrl = e.target.result;
            agregarReparacion(nombre, numeroMaquina, prioridad, status, imagenDataUrl, descripcion);
            // Cerrar el formulario inmediatamente después de agregar
            document.getElementById("formulario").style.display = "none";
            // Limpiar el formulario
            document.getElementById("form-reparacion").reset();
        };

        reader.readAsDataURL(file);
    } else {
        alert("Por favor, seleccione una imagen.");
    }
});

// Función para agregar una nueva reparación
function agregarReparacion(nombre, numeroMaquina, prioridad, status, imagen, descripcion) {
    const fechaHoraIngreso = new Date().toLocaleString();
    
    const nuevaReparacion = {
        nombre,
        numeroMaquina,
        prioridad,
        status,
        imagen,
        descripcion,
        fechaHoraIngreso
    };

    // Guardar en Firebase
    const newReparacionRef = reparacionesRef.push();
    newReparacionRef.set(nuevaReparacion)
        .then(() => {
            console.log('Reparación guardada en Firebase');
            // Enviar correo después de guardar exitosamente
            enviarCorreoNuevaReparacion(nuevaReparacion);
        })
        .catch(error => {
            console.error('Error al guardar en Firebase:', error);
            alert('Error al guardar la reparación');
        });
}

// Función para enviar el correo
function enviarCorreoNuevaReparacion(datos) {
    const templateParams = {
        to_email: 'matiasrolon51@gmail.com',
        from_name: 'Sistema de Control Taller',
        message: `
            Nueva reparación ingresada:
            
            Operario: ${datos.nombre}
            Número de Máquina: ${datos.numeroMaquina}
            Prioridad: ${datos.prioridad}
            Status: ${datos.status}
            Descripción: ${datos.descripcion}
            Fecha y Hora: ${datos.fechaHoraIngreso}
        `
    };

    emailjs.send('TU_SERVICE_ID', 'TU_TEMPLATE_ID', templateParams)
        .then(function(response) {
            console.log('Correo enviado:', response.status, response.text);
        }, function(error) {
            console.error('Error al enviar correo:', error);
        });
}

// Función para guardar las reparaciones en localStorage
function guardarReparaciones() {
    localStorage.setItem('reparaciones', JSON.stringify(reparaciones));
}

// Función para cambiar el color de la fila según la prioridad
function cambiarColorFila(select) {
    const fila = select.closest('tr');
    const prioridad = select.value;
    const statusSelect = fila.querySelector('select[onchange*="desmarcarFuncionando"]');

    fila.classList.remove('alta', 'media', 'baja');

    // Si el status es "funcionando", poner el fondo blanco
    if (statusSelect && statusSelect.value === 'funcionando') {
        fila.style.backgroundColor = 'white';
        fila.style.color = '#333'; // Restaurar color de texto original
        return;
    }

    // Si no está funcionando, aplicar los colores según prioridad
    if (prioridad === 'alta') {
        fila.classList.add('alta');
    } else if (prioridad === 'media') {
        fila.classList.add('media');
    } else if (prioridad === 'baja') {
        fila.classList.add('baja');
    }
}

// También necesitamos modificar la función desmarcarFuncionando para que actualice el color
function desmarcarFuncionando(select) {
    const fila = select.closest('tr');
    const prioridadSelect = fila.querySelector('select[onchange*="cambiarColorFila"]');
    
    if (select.value === 'funcionando') {
        fila.style.backgroundColor = 'white';
        fila.style.color = '#333';
    } else {
        fila.style.backgroundColor = '';
        fila.style.color = '';
        cambiarColorFila(prioridadSelect);
    }
}

// Función para cambiar el color del círculo según el estado
function actualizarColorCirculo(select) {
    const fila = select.closest('tr');
    const statusCircle = fila.querySelector('.status-circle');

    if (select.value === 'funcionando') {
        statusCircle.style.backgroundColor = 'green';
    } else {
        switch (select.value) {
            case 'en_reparacion':
                statusCircle.style.backgroundColor = 'orange';
                break;
            case 'detenido':
                statusCircle.style.backgroundColor = 'red';
                break;
        }
    }
}

// Función para ver la imagen y descripción
function verImagen(nombre, imagen, descripcion) {
    document.getElementById("imagenReparacion").src = imagen;
    document.getElementById("descripcionReparacion").innerText = descripcion;
    document.getElementById("ventanaEmergente").style.display = "block";
}

// Función para cerrar la ventana emergente
function cerrarVentanaEmergente() {
    document.getElementById("ventanaEmergente").style.display = "none";
}

// Función para cargar las reparaciones al iniciar
function cargarReparaciones() {
    const reparacionesGuardadas = localStorage.getItem('reparaciones');
    if (reparacionesGuardadas) {
        reparaciones = JSON.parse(reparacionesGuardadas);
        const tbody = document.querySelector('.reparaciones-container tbody');
        tbody.innerHTML = ''; // Limpiar la tabla antes de cargar
        
        reparaciones.forEach(reparacion => {
            agregarReparacion(
                reparacion.nombre,
                reparacion.numeroMaquina,
                reparacion.prioridad,
                reparacion.status,
                reparacion.imagen,
                reparacion.descripcion
            );
            
            // Asegurarse de que las filas con estado "funcionando" mantengan su estilo
            const ultimaFila = tbody.lastElementChild;
            if (reparacion.status === 'funcionando') {
                ultimaFila.style.backgroundColor = 'white';
                ultimaFila.style.color = '#333';
                ultimaFila.classList.remove('alta', 'media', 'baja');
            }
        });
    }
}

// Agregar event listener para cambios en los selects
document.addEventListener('change', function(e) {
    if (e.target.tagName === 'SELECT') {
        const fila = e.target.closest('tr');
        if (!fila) return;

        const index = Array.from(fila.parentNode.children).indexOf(fila);
        if (index !== -1) {
            const prioridadSelect = fila.querySelector('select[onchange*="cambiarColorFila"]');
            const statusSelect = fila.querySelector('select[onchange*="desmarcarFuncionando"]');
            
            // Actualizar en Firebase
            const reparacionKey = Object.keys(reparacionesRef.val())[index];
            reparacionesRef.child(reparacionKey).update({
                prioridad: prioridadSelect.value,
                status: statusSelect.value
            });
        }
    }
});

// Cargar las reparaciones al iniciar la página
document.addEventListener('DOMContentLoaded', cargarReparaciones);

// Función para exportar la tabla a Excel
function exportarAExcel() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(document.querySelector('.reparaciones-container table'));

    const fechaHora = new Date().toLocaleString();
    const headerRow = ['Fecha de Exportación', fechaHora];

    XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: 'A1' });
    XLSX.utils.book_append_sheet(wb, ws, 'Reparaciones');
    XLSX.writeFile(wb, `reparaciones_${fechaHora.replace(/[/ :]/g, '-')}.xls`);
}
