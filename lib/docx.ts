import mammoth from "mammoth";

export async function textoDocx(arq: string): Promise<string> {
  const { value } = await mammoth.extractRawText({ path: arq });
  return value.replace(/\n{3,}/g, "\n\n").trim();
}
