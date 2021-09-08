declare module 'fetch-readablestream'

declare module 'json-stringify-nice' {
  export default function stringify(object: objcet): string;
}

declare module 'snarkjs' {
  export type MemFileType = 'mem'

  export interface MemFile {
    type: MemFileType,
    data?: Uint8Array,
  }

  export interface Logger {
    log: (s: string) => void,
    debug: (s: string) => void,
    info: (s: string) => void,
    warn: (s: string) => void,
    error: (s: string) => void,
  }

  namespace zKey {
    function newZKey(r1cs: Uint8Array, ptau: Uint8Array, zkeyFirst: MemFile, logger: Logger): any;

    function contribute(zKeyCurr: MemFile, zKeyNext: MemFile, name: string, entropy: Uint8Array, logger: Logger): Uint8Array;

    function verifyFromR1cs(r1cs: Uint8Array, ptauFinal: Uint8Array, zKeyFinal: MemFile, logger: Logger): boolean;

    function verifyFromInit(zKeyFirst: MemFile, ptauFinal: MemFile, zKeyFinal: MemFile, logger: Logger): boolean;
  }
}

