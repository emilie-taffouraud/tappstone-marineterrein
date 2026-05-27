import net from "net";

const METADATA_FIELDS = new Set([
  "db_spl",
  "sound_level_db",
  "db",
  "dba",
  "level",
  "start_recording",
  "rpi_temp",
  "ptp",
  "rms",
  "wind_speed",
]);

const clients = new Map();

function encodeRemainingLength(length) {
  const bytes = [];
  let value = length;

  do {
    let encodedByte = value % 128;
    value = Math.floor(value / 128);
    if (value > 0) encodedByte |= 128;
    bytes.push(encodedByte);
  } while (value > 0);

  return Buffer.from(bytes);
}

function writeUtf8(value) {
  const body = Buffer.from(String(value), "utf8");
  const header = Buffer.alloc(2);
  header.writeUInt16BE(body.length, 0);
  return Buffer.concat([header, body]);
}

function mqttPacket(typeAndFlags, body) {
  return Buffer.concat([Buffer.from([typeAndFlags]), encodeRemainingLength(body.length), body]);
}

function connectPacket(config) {
  const variableHeader = Buffer.concat([
    writeUtf8("MQTT"),
    Buffer.from([4, 0xc2, 0, 60]),
  ]);
  const payload = Buffer.concat([
    writeUtf8(`marineterrein-sound-${Date.now()}`),
    writeUtf8(config.username),
    writeUtf8(config.password),
  ]);
  return mqttPacket(0x10, Buffer.concat([variableHeader, payload]));
}

function subscribePacket(topic) {
  const packetId = Buffer.from([0, 1]);
  const topicFilter = Buffer.concat([writeUtf8(topic), Buffer.from([0])]);
  return mqttPacket(0x82, Buffer.concat([packetId, topicFilter]));
}

function pingPacket() {
  return Buffer.from([0xc0, 0]);
}

function readPacket(buffer) {
  if (buffer.length < 2) return null;

  let multiplier = 1;
  let remainingLength = 0;
  let offset = 1;
  let encodedByte = 0;

  do {
    if (offset >= buffer.length) return null;
    encodedByte = buffer[offset];
    remainingLength += (encodedByte & 127) * multiplier;
    multiplier *= 128;
    offset += 1;
  } while ((encodedByte & 128) !== 0);

  const packetLength = offset + remainingLength;
  if (buffer.length < packetLength) return null;

  return {
    packet: buffer.subarray(0, packetLength),
    body: buffer.subarray(offset, packetLength),
    rest: buffer.subarray(packetLength),
  };
}

function timestampToIso(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric > 1_000_000_000_000 ? numeric : numeric * 1000)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function soundClassScores(fields) {
  const scores = {};

  for (const [key, value] of Object.entries(fields || {})) {
    if (METADATA_FIELDS.has(key.toLowerCase())) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      scores[key] = parsed;
    }
  }

  return scores;
}

function dominantSoundClass(fields) {
  const scores = soundClassScores(fields);
  let winner = null;

  for (const [label, score] of Object.entries(scores)) {
    if (!winner || score > winner.score) {
      winner = { label, score };
    }
  }

  return winner;
}

function normalizeSoundMessage(payloadText, topic) {
  const receivedAt = new Date().toISOString();
  const parsed = JSON.parse(payloadText);
  const fields = parsed.payload_fields && typeof parsed.payload_fields === "object"
    ? parsed.payload_fields
    : parsed;
  const soundLevel = firstFiniteNumber(fields.db_spl, fields.sound_level_db, fields.db, fields.dba, fields.level);
  const classScores = soundClassScores(fields);
  const dominantClass = dominantSoundClass(fields);
  const observedAt = timestampToIso(parsed.time ?? fields.time ?? fields.start_recording, receivedAt);

  return {
    topic,
    deviceId: parsed.dev_id || fields.dev_id || "OE-007",
    soundLevel,
    soundClass: dominantClass?.label || "Unclassified",
    soundClassScore: dominantClass?.score ?? null,
    classScores,
    observedAt,
    receivedAt,
    raw: parsed,
  };
}

function buildConfig(env) {
  return {
    host: env.soundMqttHost,
    port: env.soundMqttPort,
    username: env.soundMqttUsername,
    password: env.soundMqttPassword,
    topic: env.soundMqttTopic,
  };
}

function configKey(config) {
  return `${config.host}:${config.port}:${config.username}:${config.topic}`;
}

function createClient(config, options = {}) {
  let socket = null;
  let buffer = Buffer.alloc(0);
  let reconnectTimer = null;
  let pingTimer = null;
  let started = false;
  let onMessage = options.onMessage || null;
  const state = {
    connected: false,
    subscribed: false,
    lastError: null,
    latest: null,
  };

  function clearTimers() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  function scheduleReconnect() {
    if (!started || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 5000);
    reconnectTimer.unref?.();
  }

  function handlePublish(packet, body) {
    const topicLength = body.readUInt16BE(0);
    const topic = body.subarray(2, 2 + topicLength).toString("utf8");
    const qos = (packet[0] & 0x06) >> 1;
    const payloadOffset = 2 + topicLength + (qos > 0 ? 2 : 0);
    const payloadText = body.subarray(payloadOffset).toString("utf8");

    try {
      state.latest = normalizeSoundMessage(payloadText, topic);
      state.lastError = null;
      if (onMessage) {
        Promise.resolve(onMessage(state.latest)).catch((error) => {
          state.lastError = `Unable to store sound MQTT payload: ${error.message}`;
        });
      }
    } catch (error) {
      state.lastError = `Unable to parse sound MQTT payload: ${error.message}`;
    }
  }

  function handlePacket(packet, body) {
    const packetType = packet[0] >> 4;

    if (packetType === 2) {
      const returnCode = body[1];
      state.connected = returnCode === 0;
      state.lastError = returnCode === 0 ? null : `MQTT connection refused with code ${returnCode}`;
      if (returnCode === 0 && socket) {
        socket.write(subscribePacket(config.topic));
        pingTimer = setInterval(() => socket?.write(pingPacket()), 30000);
        pingTimer.unref?.();
      }
      return;
    }

    if (packetType === 3) {
      handlePublish(packet, body);
      return;
    }

    if (packetType === 9) {
      state.subscribed = true;
    }
  }

  function processBuffer() {
    let next;
    while ((next = readPacket(buffer))) {
      buffer = next.rest;
      handlePacket(next.packet, next.body);
    }
  }

  function connect() {
    clearTimers();
    state.connected = false;
    state.subscribed = false;
    socket = net.createConnection({ host: config.host, port: config.port }, () => {
      socket.write(connectPacket(config));
    });
    socket.setKeepAlive(true, 30000);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      processBuffer();
    });
    socket.on("error", (error) => {
      state.lastError = error.message;
    });
    socket.on("close", () => {
      state.connected = false;
      state.subscribed = false;
      clearTimers();
      scheduleReconnect();
    });
  }

  return {
    updateOptions(nextOptions = {}) {
      if (nextOptions.onMessage) {
        onMessage = nextOptions.onMessage;
      }
    },
    start() {
      if (started) return;
      started = true;
      connect();
    },
    snapshot() {
      return { ...state };
    },
  };
}

export function startSoundMqttClient(env, options = {}) {
  const config = buildConfig(env);

  if (!config.password) {
    return {
      enabled: false,
      connected: false,
      subscribed: false,
      lastError: "Missing SOUND_MQTT_PASSWORD.",
      latest: null,
    };
  }

  const key = configKey(config);
  if (!clients.has(key)) {
    clients.set(key, createClient(config, options));
  }

  const client = clients.get(key);
  client.updateOptions(options);
  client.start();

  return {
    enabled: true,
    ...client.snapshot(),
  };
}
