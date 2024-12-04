const express = require("express");
const mqtt = require("mqtt");
const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

// Dirección IP y puerto del PLC
const PLC_IP = "192.168.0.1"; // Cambia esto por la IP de tu PLC
const PLC_PORT = 502; // Puerto Modbus

// Conexión al servidor MQTT
const mqttClient = mqtt.connect("mqtt://192.168.1.8", {
  // Reemplaza por la IP de tu servidor MQTT
  port: 1883, // Asegúrate de usar el puerto correcto
  clientId: "plc-client", // Un identificador único para este cliente
  clean: true,
});

mqttClient.on("connect", () => {
  console.log("Conectado al servidor MQTT");
});

// Función para leer los registros del PLC y publicar los datos en MQTT
const obtenerYPublicarRegistros = async () => {
  try {
    // Conectar al PLC
    await client.connectTCP(PLC_IP, { port: PLC_PORT });
    console.log("Conexión establecida con el PLC");

    // Cambiar el ID del esclavo según la configuración
    await client.setID(1);

    // Leer los registros de "ESTADO" (puedes ajustar los offsets y registros según sea necesario)
    const registros = {
      piezasAprobadas: await client.readHoldingRegisters(0, 1), // Lee un registro
      numeroDeLotes: await client.readHoldingRegisters(1, 1), // Lee otro registro
      piezasRechazadas: await client.readHoldingRegisters(2, 1), // Lee otro registro
      arranque: await client.readHoldingRegisters(3, 1),
     
    };

    // Estructurar el objeto con los registros leídos
    const resultado = {
      piezasAprobadas: registros.piezasAprobadas.data[0],
      numeroDeLotes: registros.numeroDeLotes.data[0],
      piezasRechazadas: registros.piezasRechazadas.data[0],
      arranque: registros.arranque.data[0],
    };

    console.log("Registros del PLC:", resultado);

    // Publicar los datos en un tópico de MQTT
    mqttClient.publish("plc/estado", JSON.stringify(resultado), {
      qos: 1,
      retain: true,
    });
    console.log("Datos enviados a MQTT en el tópico 'plc/estado'");
  } catch (err) {
    console.error("Error de comunicación:", err.message);
  }
};

// Crear un servidor Express
const app = express();
const port = 3000;

// Ruta para obtener los datos del PLC
setInterval(obtenerYPublicarRegistros, 5000); // Llama a la función para obtener y publicar los registros

// Iniciar el servidor Express
app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});
