// Uso: npm run configurar -- <link do projeto do Flow>
import { extrairProjetoFlow, gravarEnvLocal } from "../lib/env-local.ts";
const entrada = process.argv.slice(2).join(" ");
const id = extrairProjetoFlow(entrada);
if (!id) { console.error("❌ Não achei o projeto nesse link. Abra o projeto no Flow e copie o endereço inteiro da barra do navegador (termina com /project/…)."); process.exit(1); }
gravarEnvLocal(process.cwd(), "FLOW_PROJETO", id);
console.log(`✅ Projeto do Flow configurado: ${id}`);
