// @ts-ignore
import server from "../dist/server.cjs";

const handler = (server as any).default || server;

export default handler;
