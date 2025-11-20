/// <reference types="vite/client" />

declare global {
  namespace ImportMeta {
    interface Env {
      readonly VITE_SUISIGN_PACKAGE_ID: string;
    }
    interface ImportMeta {
      readonly env: Env;
    }
  }
}

export {};
