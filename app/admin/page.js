"use client";

import { useEffect, useState } from "react";

const EMPTY_SHIFTS = [
  { phone: "", start: "00:00", end: "12:00" },
  { phone: "", start: "12:00", end: "00:00" },
];

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [shifts, setShifts] = useState(EMPTY_SHIFTS);
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

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
    setLoadingSchedule(true);
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.shifts) && data.shifts.length === 2) {
          setShifts(data.shifts);
        }
      })
      .finally(() => setLoadingSchedule(false));
  }, [loggedIn]);

  function updateShift(index, field, value) {
    setShifts((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    if (saveError) setSaveError("");
    if (savedMessage) setSavedMessage("");
  }

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
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "No se pudo guardar el horario");
        return;
      }
      setShifts(data.shifts);
      setSavedMessage("Numeros y horarios actualizados correctamente.");
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
    setShifts(EMPTY_SHIFTS);
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
      <div className="info-pill">NUMEROS Y HORARIOS DE WHATSAPP</div>
      <form className="form" onSubmit={handleSave} noValidate>
        {shifts.map((shift, i) => (
          <div className="shift-block" key={i}>
            <p className="shift-title">Numero {i + 1}</p>
            <input
              type="text"
              className="field"
              placeholder="Ej: 5491122334455"
              value={shift.phone}
              disabled={loadingSchedule}
              onChange={(e) => updateShift(i, "phone", e.target.value)}
            />
            <div className="time-row">
              <label className="time-field">
                <span>Desde</span>
                <input
                  type="time"
                  className="field"
                  value={shift.start}
                  disabled={loadingSchedule}
                  onChange={(e) => updateShift(i, "start", e.target.value)}
                />
              </label>
              <label className="time-field">
                <span>Hasta</span>
                <input
                  type="time"
                  className="field"
                  value={shift.end}
                  disabled={loadingSchedule}
                  onChange={(e) => updateShift(i, "end", e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
        <p className="hint-text">
          Horarios en huso horario de Argentina. Fuera del rango del Numero 1 se usa automaticamente el Numero 2.
        </p>
        {saveError ? <p className="error-text">{saveError}</p> : null}
        {savedMessage ? <p className="success-text">{savedMessage}</p> : null}
        <button type="submit" className="submit-btn" disabled={saving || loadingSchedule}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
      <button type="button" className="logout-btn" onClick={handleLogout}>
        Cerrar sesion
      </button>
    </main>
  );
}
