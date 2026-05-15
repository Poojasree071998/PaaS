import { dirname } from "path";
import { fileURLToPath } from "url";
import nextVitals from "eslint-config-next/core-web-vitals.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [...nextVitals];
