// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic"; // prevents prerender issues for login flows

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
            <div className="h-6 w-40 bg-slate-100 rounded mb-6 animate-pulse" />
            <div className="h-4 w-56 bg-slate-100 rounded mb-10 animate-pulse" />
            <div className="space-y-4">
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
