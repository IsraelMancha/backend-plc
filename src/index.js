const express = require("express");
const ModbusRTU = require("modbus-serial");
const cors = require("cors");

const client = new ModbusRTU();
let isConnected = false; // Bandera para saber si el cliente está conectado

// Dirección IP y puerto del PLC
const PLC_IP = "192.168.0.1"; // Cambia esto por la IP de tu PLC
const PLC_PORT = 502; // Puerto Modbus

// Función para conectar al PLC
const conectarPLC = async () => {
  if (!isConnected) {
    try {
      await client.connectTCP(PLC_IP, { port: PLC_PORT });
      await client.setID(1); // Cambiar según la configuración de tu PLC
      isConnected = true;
      console.log("Conexión establecida con el PLC");
    } catch (err) {
      console.error("Error al conectar con el PLC:", err.message);
      isConnected = false;
    }
  }
};

// Función para obtener los registros del PLC
const obtenerYPublicarRegistros = async () => {
  try {
    // Asegúrate de estar conectado al PLC
    await conectarPLC();

    // Leer los registros
    const piezasAprobadas = (await client.readHoldingRegisters(0, 1)).data[0];
    const numeroDeLotes = (await client.readHoldingRegisters(1, 1)).data[0];
    const piezasRechazadas = (await client.readHoldingRegisters(2, 1)).data[0];
    const arranque = (await client.readHoldingRegisters(3, 1)).data[0];

    // Estructurar el objeto con los registros
    return {
      piezasAprobadas,
      numeroDeLotes,
      piezasRechazadas,
      arranque,
    };
  } catch (err) {
    console.error("Error de comunicación con el PLC:", err.message);
    throw new Error("No se pudo leer los datos del PLC");
  }
};

// Manejadores de eventos del cliente Modbus
client.on("error", (err) => {
  console.error("Error del cliente Modbus:", err.message);
  isConnected = false; // Reinicia la bandera de conexión
});

client.on("close", () => {
  console.log("Conexión con el PLC cerrada");
  isConnected = false; // Reinicia la bandera de conexión
});

// Crear un servidor Express
const app = express();
const port = 3000;

app.use(
  cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Ruta para obtener los datos del PLC
app.get("/plc", async (req, res) => {
  try {
    const registros = await obtenerYPublicarRegistros();
    res.json(registros);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar el servidor Express
app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});
