"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [phone, setPhone] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        setLoggedIn(Boolean(data.loggedIn));
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    setLoadingPhone(true);
    fetch("/api/phone")
      .then((r) => r.json())
      .then((data) => setPhone(data.phone || ""))
      .finally(() => setLoadingPhone(false));
  }, [loggedIn]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "No se pudo iniciar sesion");
        return;
      }
      setPassword("");
      setLoggedIn(true);
    } catch (err) {
      setLoginError("Error de conexion. Intenta de nuevo.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    setSavedMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "No se pudo guardar el numero");
        return;
      }
      setPhone(data.phone);
      setSavedMessage("Numero actualizado correctamente.");
    } catch (err) {
      setSaveError("Error de conexion. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setPassword("");
    setPhone("");
    setSavedMessage("");
    setSaveError("");
  }

  if (checkingSession) {
    return (
      <main className="page">
        <p className="eyebrow">Cargando...</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="page">
        <p className="eyebrow">PANEL ADMIN</p>
        <form className="form" onSubmit={handleLogin} noValidate>
          <input
            type="password"
            className={`field${loginError ? " field-error" : ""}`}
            placeholder="Contrasena"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (loginError) setLoginError("");
            }}
            autoFocus
          />
          {loginError ? <p className="error-text">{loginError}</p> : null}
          <button type="submit" className="submit-btn" disabled={loggingIn}>
            {loggingIn ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="eyebrow">PANEL ADMIN</p>
      <div className="info-pill">NUMERO DE WHATSAPP</div>
      <form className="form" onSubmit={handleSave} noValidate>
        <input
          type="text"
          className={`field${saveError ? " field-error" : ""}`}
          placeholder="Ej: 5491122334455"
          value={phone}
          disabled={loadingPhone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (saveError) setSaveError("");
            if (savedMessage) setSavedMessage("");
          }}
        />
        <p className="hint-text">Codigo de pais + numero, solo digitos. Sin +, espacios ni guiones.</p>
        {saveError ? <p className="error-text">{saveError}</p> : null}
        {savedMessage ? <p className="success-text">{savedMessage}</p> : null}
        <button type="submit" className="submit-btn" disabled={saving || loadingPhone}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
      <button type="button" className="logout-btn" onClick={handleLogout}>
        Cerrar sesion
      </button>
    </main>
  );
}
