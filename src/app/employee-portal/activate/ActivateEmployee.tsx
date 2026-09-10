"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";

export default function ActivateEmployee() {
  const token = useSearchParams()?.get("token") ?? ""; const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [complete, setComplete] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!token) { setNotice("This activation link is incomplete."); return; }
    if (password.length < 10) { setNotice("Use at least 10 characters."); return; } if (password !== confirm) { setNotice("Passwords do not match."); return; }
    setBusy(true); setNotice(""); try { const response = await fetch(`${runtimeConfig.getApiUrl("hrm")}/api/employee/activate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      if (!response.ok) { const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null; throw new Error(body?.detail ?? body?.message ?? "The link is invalid, expired, or already used."); }
      setComplete(true); setPassword(""); setConfirm("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Activation could not be completed."); } finally { setBusy(false); } }
  const card: React.CSSProperties = { maxWidth: 520, margin: "8vh auto", padding: 28, border: "1px solid #dbe3ee", borderRadius: 12, background: "white", boxShadow: "0 12px 36px rgba(0,0,0,.08)" };
  if (complete) return <section style={card} data-testid="phase5e-activation-success"><h1>Employee account activated</h1><p>Your password is set and this one-time link can no longer be used.</p><Link href="/employee-portal/login">Continue to ISOFT HRIS login</Link></section>;
  return <section style={card} data-testid="phase5e-activation"><h1>Activate employee account</h1><p>Set your ISOFT HRIS password using the secure one-time link provided by HR. This page does not request employee numbers or other personal data.</p>
    {!token && <div role="alert" style={{ padding: 10, background: "#fff3cd" }}>This activation link is incomplete. Request a new secure link from HR.</div>}
    {notice && <div role="alert" style={{ padding: 10, marginBottom: 12, background: "#fff3cd" }}>{notice}</div>}
    <form onSubmit={submit}><label htmlFor="newPassword">New password</label><input id="newPassword" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e => setPassword(e.target.value)} style={{ display: "block", width: "100%", padding: 10, margin: "6px 0 14px" }} />
      <label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={e => setConfirm(e.target.value)} style={{ display: "block", width: "100%", padding: 10, margin: "6px 0 14px" }} />
      <button type="submit" disabled={busy || !token} style={{ padding: "10px 16px", background: "#1a3c6e", color: "white", border: 0, borderRadius: 6 }}>{busy ? "Activating…" : "Activate account"}</button></form></section>;
}
