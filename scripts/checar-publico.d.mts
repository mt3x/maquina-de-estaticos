export type Entrada = { termo: string; palavra?: boolean };
export declare const TERMOS: string[];
export declare const ENTRADAS: Entrada[];
export declare function acharProibidos(arquivos: { caminho: string; conteudo: string }[], termos: (string | Entrada)[]): { caminho: string; termo: string; linha: number }[];
