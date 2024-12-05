const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const multer = require("multer");
const nodemailer = require('nodemailer'); // Para enviar correos electrónicos

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de credenciales SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "cl.ma.gu2018@gmail.com", // Tu correo
        pass: "xmpm pwuh urmd ignw",   // Tu contraseña SMTP o token de aplicación
    },
});

// Configuración inicial
const API_TOKEN = "ffa135f8b667ddb65202f7b5209e6ebd881aa542";
const ALERTAS_URL = 'https://kf.kobotoolbox.org/api/v2/assets/ajD8aqrhgMDzLwikLdSeJi/data/';
const INFRAESTRUCTURA_URL = 'https://kf.kobotoolbox.org/api/v2/assets/aZjpvTMrqLZEYB8CoWKjK5/data/';
const whitelist = ["cl.ma.gu2018@gmail.com"]; // Lista de correos para enviar notificaciones
let sentAlertIds = new Set(); // Para rastrear alertas enviadas

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Sirve archivos estáticos como dashboard.html

// Configuración de multer para manejar la carga de archivos
const upload = multer({ dest: "uploads/" }); // Carpeta temporal donde se almacenan los archivos subidos

// **Endpoint para subir archivos**
app.post("/api/upload", upload.single("file"), (req, res) => {
    const file = req.file; // Archivo recibido

    // Verificar si el archivo fue recibido
    if (!file) {
        return res.status(400).send("No se proporcionó ningún archivo.");
    }

    // Determinar el tipo de archivo
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === ".geojson" || file.mimetype === "application/json") {
        // Procesar GeoJSON
        const filePath = `/uploads/${file.filename}.geojson`;
        res.json({ success: true, url: filePath }); // Respuesta al cliente con la URL del archivo
    } else if (extension === ".png" || file.mimetype === "image/png") {
        // Procesar PNG
        const filePath = `/uploads/${file.filename}.png`;
        res.json({ success: true, url: filePath }); // Respuesta al cliente con la URL del archivo
    } else {
        // Si el archivo no es GeoJSON o PNG, devolver error
        res.status(400).send("Formato de archivo no soportado. Solo se permite GeoJSON o PNG.");
    }
});

// Servir los archivos subidos como recursos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// **Endpoint para obtener datos de alertas**
app.get('/api/alertas', async (req, res) => {
    try {
        const response = await axios.get(ALERTAS_URL, {
            headers: { Authorization: `Token ${API_TOKEN}` }
        });

        const newAlerts = response.data.results.filter(alert => !sentAlertIds.has(alert.id));
        newAlerts.forEach(alert => sentAlertIds.add(alert.id));

        if (newAlerts.length > 0) {
            sendEmailNotifications(newAlerts);
        }

        res.status(response.status).send(response.data);
    } catch (error) {
        console.error('Error al obtener datos de alertas:', error.response?.data || error.message);
        res.status(error.response?.status || 500).send('Error al procesar datos de alertas.');
    }
});

// **Endpoint para obtener datos de infraestructura**
app.get('/api/infraestructura', async (req, res) => {
    try {
        const response = await axios.get(INFRAESTRUCTURA_URL, {
            headers: { Authorization: `Token ${API_TOKEN}` }
        });
        res.status(response.status).send(response.data);
    } catch (error) {
        console.error('Error al obtener datos de infraestructura:', error.response?.data || error.message);
        res.status(error.response?.status || 500).send('Error al procesar datos de infraestructura.');
    }
});

// Función para enviar correos electrónicos a la whitelist
function sendEmailNotifications(alerts) {
    const emailContent = alerts.map(alert => `
        <h2>Alerta Nueva</h2>
        <p><b>Tipo de Infraestructura:</b> ${alert.nombre}</p>
        <p><b>Gravedad:</b> ${alert.gravedad}</p>
        <p><b>Ubicación:</b> ${alert.ubicacion}</p>
        <p><b>Descripción:</b> ${alert.descripcion || 'Sin descripción'}</p>
    `).join('<hr>');

    whitelist.forEach(email => {
        transporter.sendMail({
            from: "cl.ma.gu2018@gmail.com",
            to: email,
            subject: "Nueva Alerta en el Sistema",
            html: emailContent,
        }, (err, info) => {
            if (err) {
                console.error(`Error al enviar correo a ${email}:`, err);
            } else {
                console.log(`Correo enviado a ${email}:`, info.response);
            }
        });
    });
}

// Ruta principal para servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
