import dgram from "node:dgram";

export interface LivePlayer {
  name: string;
  score: number;
  durationSeconds: number;
}

export interface ServerQuerySnapshot {
  playerCount: number;
  maxPlayers: number;
  players: LivePlayer[];
}

const A2S_INFO_REQUEST = Buffer.concat([
  Buffer.from([0xff, 0xff, 0xff, 0xff, 0x54]),
  Buffer.from("Source Engine Query\0", "utf8"),
]);

const PLAYER_CHALLENGE_REQUEST = Buffer.from([
  0xff, 0xff, 0xff, 0xff, 0x55, 0xff, 0xff, 0xff, 0xff,
]);

function readCString(buffer: Buffer, offset: number) {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0x00) end += 1;
  return {
    value: buffer.toString("utf8", offset, end),
    next: end + 1,
  };
}

async function sendUdpPacket(host: string, port: number, payload: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const cleanup = () => {
      try {
        socket.close();
      } catch {
        // ignore close race
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Server query timed out"));
    }, 2500);

    socket.once("error", (error) => {
      clearTimeout(timeout);
      cleanup();
      reject(error);
    });

    socket.once("message", (message) => {
      clearTimeout(timeout);
      cleanup();
      resolve(message);
    });

    socket.send(payload, port, host, (error) => {
      if (error) {
        clearTimeout(timeout);
        cleanup();
        reject(error);
      }
    });
  });
}

async function queryInfo(host: string, port: number) {
  const response = await sendUdpPacket(host, port, A2S_INFO_REQUEST);
  if (response.length < 7 || response.readInt32LE(0) !== -1 || response[4] !== 0x49) {
    throw new Error("Unexpected A2S_INFO response");
  }

  let cursor = 6; // skip header + type + protocol
  cursor = readCString(response, cursor).next; // name
  cursor = readCString(response, cursor).next; // map
  cursor = readCString(response, cursor).next; // folder
  cursor = readCString(response, cursor).next; // game
  cursor += 2; // app id
  const playerCount = response[cursor] ?? 0;
  const maxPlayers = response[cursor + 1] ?? 0;

  return { playerCount, maxPlayers };
}

async function queryPlayers(host: string, port: number) {
  const challengeResponse = await sendUdpPacket(host, port, PLAYER_CHALLENGE_REQUEST);
  if (
    challengeResponse.length < 9 ||
    challengeResponse.readInt32LE(0) !== -1 ||
    challengeResponse[4] !== 0x41
  ) {
    throw new Error("Unexpected A2S_PLAYER challenge response");
  }

  const challenge = challengeResponse.subarray(5, 9);
  const playerRequest = Buffer.concat([
    Buffer.from([0xff, 0xff, 0xff, 0xff, 0x55]),
    challenge,
  ]);
  const response = await sendUdpPacket(host, port, playerRequest);

  if (response.length < 6 || response.readInt32LE(0) !== -1 || response[4] !== 0x44) {
    throw new Error("Unexpected A2S_PLAYER response");
  }

  const count = response[5] ?? 0;
  let cursor = 6;
  const players: LivePlayer[] = [];
  for (let index = 0; index < count && cursor < response.length; index += 1) {
    cursor += 1; // player index
    const name = readCString(response, cursor);
    cursor = name.next;
    if (cursor + 8 > response.length) break;
    const score = response.readInt32LE(cursor);
    const durationSeconds = response.readFloatLE(cursor + 4);
    cursor += 8;
    players.push({
      name: name.value || `Player ${index + 1}`,
      score,
      durationSeconds,
    });
  }

  return players;
}

export async function queryRustServer(host: string, port: number): Promise<ServerQuerySnapshot> {
  const info = await queryInfo(host, port);
  let players: LivePlayer[] = [];

  try {
    players = await queryPlayers(host, port);
  } catch {
    players = [];
  }

  return {
    playerCount: info.playerCount,
    maxPlayers: info.maxPlayers,
    players,
  };
}
