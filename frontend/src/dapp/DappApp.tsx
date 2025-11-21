// frontend/src/dapp/DappApp.tsx
import React from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignPersonalMessage,
} from "@mysten/dapp-kit";
import { MailDashboard } from "./mail/MailDashboard";
import { resetSealSessionForAddress } from "../sealClient";
import { upsertHandle } from "../handleRegistry";

function truncateAddress(addr: string, n = 4) {
  if (!addr) return "";
  return `${addr.slice(0, n + 2)}...${addr.slice(-n)}`;
}

export default function DappApp() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  React.useEffect(() => {
    const addr = currentAccount?.address ?? null;

    resetSealSessionForAddress(addr);

    if (addr) {
      upsertHandle("kryptos", addr);
      upsertHandle("kryptos.sui", addr);
    }
  }, [currentAccount?.address]);

  return (
    <div className="relative min-h-screen bg-background text-slate-200">
      {/* Top app bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-background/80 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-display font-bold text-lg">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold tracking-tight text-white">
              SuiSign
            </span>
            <span className="text-[11px] text-slate-500">
              On-chain agreements on Sui + Walrus
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentAccount?.address && (
            <span className="hidden sm:inline-block text-xs font-mono px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              {truncateAddress(currentAccount.address)}
            </span>
          )}
          <ConnectButton />
        </div>
      </header>

      {/* Main Gmail-style dashboard */}
      <main className="relative">
        <MailDashboard
          currentAddress={currentAccount?.address ?? null}
          signPersonalMessage={signPersonalMessage}
        />
      </main>
    </div>
  );
}
