import { createServer } from './network/WSServer';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
createServer(PORT);
