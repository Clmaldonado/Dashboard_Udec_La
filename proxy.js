const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
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
app.use(express.static(path.join(__dirname)));

// Ruta para obtener datos de alertas
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

// Ruta para obtener datos de infraestructura
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

// Enviar correos electrónicos a la whitelist
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

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
