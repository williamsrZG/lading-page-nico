"use client";

import { useEffect, useMemo, useState } from "react";

const MAX_SHIFTS = 24;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMPTY_SHIFTS = [{ phone: "", start: "09:00", end: "12:00" }];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// Rangos del dia que no cubre ningun turno, ej: [["22:00", "09:00"]].
function findGaps(shifts) {
  const covered = new Array(1440).fill(false);
  for (const s of shifts) {
    if (!TIME_RE.test(s.start) || !TIME_RE.test(s.end)) continue;
    const start = toMinutes(s.start);
    const end = toMinutes(s.end);
    const length = start === end ? 1440 : (end - start + 1440) % 1440;
    for (let i = 0; i < length; i++) covered[(start + i) % 1440] = true;
  }
  if (covered.every(Boolean)) return [];
  if (!covered.some(Boolean)) return [["00:00", "00:00"]];

  // Arrancar a recorrer desde un minuto cubierto para no partir un hueco que cruza la medianoche.
  const offset = covered.indexOf(true);
  const gaps = [];
  let gapStart = null;
  for (let i = 0; i <= 1440; i++) {
    const minute = (offset + i) % 1440;
    if (!covered[minute] && gapStart === null) gapStart = minute;
    if (covered[minute] && gapStart !== null) {
      gaps.push([toHHMM(gapStart), toHHMM(minute)]);
      gapStart = null;
    }
  }
  return gaps;
}

function newShiftAfter(last) {
  const start = last && TIME_RE.test(last.end) ? last.end : "09:00";
  return { phone: "", start, end: toHHMM(toMinutes(start) + 180) };
}

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [shifts, setShifts] = useState(EMPTY_SHIFTS);
  const [activeIndex, setActiveIndex] = useState(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const gaps = useMemo(() => findGaps(shifts), [shifts]);

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
        if (Array.isArray(data.shifts) && data.shifts.length > 0) {
          setShifts(data.shifts);
          setActiveIndex(data.activeIndex ?? null);
        }
      })
      .finally(() => setLoadingSchedule(false));
  }, [loggedIn]);

  function clearMessages() {
    if (saveError) setSaveError("");
    if (savedMessage) setSavedMessage("");
  }

  // Cualquier cambio en la lista deja de reflejar lo guardado, asi que se oculta el "activo ahora".
  function changeShifts(updater) {
    setShifts(updater);
    setActiveIndex(null);
    clearMessages();
  }

  function updateShift(index, field, value) {
    changeShifts((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addShift() {
    changeShifts((prev) => (prev.length >= MAX_SHIFTS ? prev : [...prev, newShiftAfter(prev[prev.length - 1])]));
  }

  function removeShift(index) {
    changeShifts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function moveShift(index, direction) {
    changeShifts((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
      setActiveIndex(data.activeIndex ?? null);
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
    setActiveIndex(null);
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
          <div className={`shift-block${activeIndex === i ? " shift-active" : ""}`} key={i}>
            <div className="shift-header">
              <p className="shift-title">
                Numero {i + 1}
                {activeIndex === i ? <span className="active-badge">ACTIVO AHORA</span> : null}
              </p>
              <div className="shift-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => moveShift(i, -1)}
                  disabled={i === 0 || loadingSchedule}
                  aria-label={`Subir Numero ${i + 1}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => moveShift(i, 1)}
                  disabled={i === shifts.length - 1 || loadingSchedule}
                  aria-label={`Bajar Numero ${i + 1}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  onClick={() => removeShift(i)}
                  disabled={shifts.length <= 1 || loadingSchedule}
                  aria-label={`Eliminar Numero ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              className="field"
              placeholder="Ej: 3562458009"
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

        <button
          type="button"
          className="add-btn"
          onClick={addShift}
          disabled={shifts.length >= MAX_SHIFTS || loadingSchedule}
        >
          + Agregar numero
        </button>

        {gaps.length > 0 ? (
          <p className="warning-text">
            Horarios sin cubrir: {gaps.map(([from, to]) => `${from} a ${to}`).join(", ")}. En esos horarios se usa el
            Numero 1.
          </p>
        ) : null}

        <p className="hint-text">
          Horarios en huso horario de Argentina. Si dos turnos se pisan, gana el que esta mas arriba. Si
          &quot;Desde&quot; y &quot;Hasta&quot; son iguales, ese numero atiende las 24 horas. Los numeros de Argentina
          se pueden cargar con codigo de area (ej: 3562458009), el 549 se agrega solo.
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
