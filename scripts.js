const API_URL = "https://dashboard-udec-la.onrender.com/api"; // URL del proxy en Render

// Mapear los códigos de edificios y pisos a nombres descriptivos
const edificioMap = {
    edificio_biblioteca: "Edificio Biblioteca",
    edificio_gimnasio: "Edificio Gimnasio",
    edificio_laboratorios: "Edificio Laboratorios",
    edificio_aulas: "Edificio Aulas",
    edificio_central: "Edificio Central",
    edificio_educacion_arte: "Edificio de Educación - Arte - Informática",
    edificio_salas_taller: "Edificio Salas Taller Enrique Molina",
    edificio_asuntos: "Edificio Asuntos Estudiantiles",
    edificio_casino: "Casino",
    edificio_bano_bodega: "Baño y Bodega Taller"
};

const pisoMap = {
    piso_1: "Piso 1",
    piso_2: "Piso 2",
    piso_3: "Piso 3",
    techo: "Techumbre/Techo"
};

document.addEventListener("DOMContentLoaded", function () {
    // Crear el mapa
    const map = L.map("map", {
        center: [-37.471968972752805, -72.3451831406545],
        zoom: 18,
    });

    const tileLayers = {
        "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            minZoom: 16,
        }),
        "Esri World Imagery": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
            maxZoom: 18,
            minZoom: 16,
        }),
    };

    // Agregar la capa inicial al mapa
    tileLayers["OpenStreetMap"].addTo(map);

    // Agregar control de capas al mapa
    L.control.layers(tileLayers).addTo(map);

    // Crear grupo de capas para marcadores
    const markersLayer = L.layerGroup().addTo(map);

    // Control personalizado con checkbox para marcadores
    const checkboxControl = L.control({ position: "topright" });

    checkboxControl.onAdd = function () {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-custom");
        container.style.backgroundColor = "white";
        container.style.padding = "5px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.style.marginRight = "5px";

        const label = document.createElement("label");
        label.textContent = "Mostrar Marcadores";

        checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
                map.addLayer(markersLayer);
            } else {
                map.removeLayer(markersLayer);
            }
        });

        container.appendChild(checkbox);
        container.appendChild(label);

        return container;
    };

    checkboxControl.addTo(map);

    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${API_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`Error al cargar ${endpoint}: ${response.statusText}`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error(`Error al cargar ${endpoint}:`, error);
            return [];
        }
    }

    function renderTable(data, tableId, columns) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        tableBody.innerHTML = "";

        data.forEach((item) => {
            const row = document.createElement("tr");

            columns.forEach((col) => {
                const cell = document.createElement("td");
                let value = item[col] || "-";

                if (col === "edificio") {
                    value = edificioMap[item[col]] || "-";
                } else if (col === "piso_campus" || col === "piso_hogar") {
                    value = pisoMap[item[col]] || "-";
                } else if (col === "gravedad") {
                    value = item[col]
                        ? item[col].charAt(0).toUpperCase() + item[col].slice(1).toLowerCase()
                        : "-";
                }

                cell.textContent = value;
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }

    async function loadMarkersAndTables() {
        const alertas = await fetchData("alertas");
        const infraestructura = await fetchData("infraestructura");

        markersLayer.clearLayers(); // Limpiar marcadores antes de agregar nuevos

        alertas.forEach((alerta) => {
            const location = alerta["ubicacion_gps"];
            const gravedad = alerta["gravedad"]?.toLowerCase();
            const descripcion = alerta["descripcion"] || "Sin descripción";

            if (location) {
                const [lat, lon] = location.split(" ").map(Number);
                const colorMap = { alto: "red", medio: "orange", bajo: "yellow" };
                const color = colorMap[gravedad] || "blue";

                const marker = L.circleMarker([lat, lon], {
                    radius: 8,
                    fillColor: color,
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8,
                });

                marker.bindPopup(`
                    <b>Descripción:</b> ${descripcion}<br>
                    <b>Gravedad:</b> ${gravedad || "No especificada"}
                `);

                markersLayer.addLayer(marker); // Agregar marcador al grupo
            }
        });

        renderTable(
            alertas,
            "table-alertas",
            ["id", "nombre", "gravedad", "ubicacion", "edificio", "piso_campus", "piso_hogar", "sala", "descripcion"]
        );
        renderTable(
            infraestructura,
            "table-infraestructura",
            ["id", "nombre", "ubicacion", "edificio", "piso_campus", "piso_hogar", "sala", "descripcion"]
        );
    }

    loadMarkersAndTables();
});
