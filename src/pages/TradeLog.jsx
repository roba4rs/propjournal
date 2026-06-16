import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../supabaseClient";
import { useSidebar } from "../SidebarContext";
import { useLocation } from 'react-router-dom';
import { ChevronDown, ArrowUp, ArrowDown, Plus, Pencil, X } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAIRS = [
  // Forex Majors
  "EURUSD","GBPUSD","USDJPY","USDCHF","USDCAD","AUDUSD","NZDUSD",
  // Forex Crosses
  "EURGBP","EURJPY","EURCAD","EURAUD","EURNZD","EURCHF",
  "GBPJPY","GBPCAD","GBPAUD","GBPNZD","GBPCHF",
  "AUDJPY","AUDCAD","AUDNZD","AUDCHF",
  "CADJPY","CHFJPY","NZDJPY","NZDCAD","NZDCHF",
  // Metals
  "XAUUSD","XAGUSD","XPTUSD","XPDUSD",
  // Indices
  "US30","NAS100","SPX500","GER40","UK100","JP225","AUS200","FRA40",
  // Crypto
  "BTCUSD","ETHUSD","BNBUSD","XRPUSD","SOLUSD","ADAUSD","DOGEUSD",
  "LTCUSD","DOTUSD","LINKUSD","MATICUSD","AVAXUSD","UNIUSD","ATOMUSD",
  // Energies
  "USOIL","UKOIL","NATGAS",
];
const SESSIONS = ["london", "new_york", "asian"];

// ─── Pair Combobox ──────────────────────────────────────────────────────────────
function PairCombobox({ value, onChange, inputStyle: customInputStyle }) {
  const [query, setQuery] = useState(value || "");
  const [showList, setShowList] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowList(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  // Sort matches: exact first, then starts-with, then contains
  const matches = (() => {
    if (!query) return PAIRS;
    const q = query.toUpperCase();
    const exact   = PAIRS.filter(p => p === q);
    const starts  = PAIRS.filter(p => p !== q && p.startsWith(q));
    const contains = PAIRS.filter(p => !p.startsWith(q) && p.includes(q));
    return [...exact, ...starts, ...contains];
  })();

  function handleInput(e) {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    setShowList(true);
    onChange(val);
  }

  function select(ticker) {
    setQuery(ticker);
    onChange(ticker);
    setShowList(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setShowList(true)}
        onClick={() => setShowList(true)}
        placeholder="EURUSD, XAUUSD…"
        style={{ ...(customInputStyle || inputStyle) }}
        autoComplete="off"
        spellCheck={false}
      />
      {showList && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#111", border: "0.5px solid #1e1e1e", borderRadius: "8px",
          zIndex: 9999, maxHeight: "200px", overflowY: "auto",
        }}>
          {matches.map(p => (
            <div key={p}
              onMouseDown={() => select(p)}
              onTouchEnd={e => { e.preventDefault(); select(p); }}
              style={{
              padding: "8px 12px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px", color: p === value ? "#1bba7c" : "#ccc",
              background: p === value ? "#0f2219" : "transparent",
              transition: "background 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = p === value ? "#0f2219" : "#181818"}
              onMouseLeave={e => e.currentTarget.style.background = p === value ? "#0f2219" : "transparent"}
            >{p}</div>
          ))}
        </div>
      )}
    </div>
  );
}
function makeEmptyForm() {
  return {
    pair: localStorage.getItem("lastTradePair") || "EURUSD",
    direction: "long",
    entry: "",
    stop_loss: "",
    take_profit: "",
    rr: "",
    session: "london",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    screenshot_url: null,
    outcome: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcRR(entry, sl, tp) {
  const e = parseFloat(entry);
  const s = parseFloat(sl);
  const t = parseFloat(tp);
  if (!e || !s || !t) return "";
  const risk = Math.abs(e - s);
  const reward = Math.abs(t - e);
  if (risk === 0) return "";
  return (reward / risk).toFixed(2);
}

function calcPnl(riskPct, accountSize, rr, outcome) {
  const r = parseFloat(riskPct);
  const a = parseFloat(accountSize);
  const rr_ = parseFloat(rr);
  if (!r || !a) return null;
  const riskAmount = (r / 100) * a;
  if (outcome === "be") return (0).toFixed(2);
  if (outcome === "loss") return (-riskAmount).toFixed(2);
  if (!rr_) return null;
  return (riskAmount * rr_).toFixed(2); // win or in_progress
}

// Resolves risk% regardless of input mode (% or $)
function resolveRiskPct(accId, accountRisks, accountRiskModes, accounts) {
  const val = parseFloat(accountRisks[accId]);
  if (isNaN(val) || val <= 0) return null;
  const mode = accountRiskModes[accId] || "$";
  if (mode === "%") return val;
  const acc = accounts.find(a => a.id === accId);
  if (!acc?.account_size) return null;
  return (val / acc.account_size) * 100;
}

function fmt(n) {
  if (n === null || n === undefined || n === "") return "—";
  return parseFloat(n).toFixed(2);
}

function pnlColor(pnl) {
  const v = parseFloat(pnl);
  if (v > 0) return "#1bba7c";
  if (v < 0) return "#c03535";
  return "#999";
}

function directionBadge(dir) {
  const isLong = dir === "long";
  return (
    <span style={{
      fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "2px 8px", borderRadius: "4px",
      background: isLong ? "#0f2219" : "#1e0d0d",
      color: isLong ? "#1bba7c" : "#c03535",
      border: `0.5px solid ${isLong ? "#1a3826" : "#2e1515"}`,
    }}>{dir}</span>
  );
}

function outcomeBadge(outcome) {
  const map = {
    win:         { label: "WIN",         bg: "#0f2219", color: "#1bba7c", border: "#1a3826" },
    loss:        { label: "LOSS",        bg: "#1e0d0d", color: "#c03535", border: "#2e1515" },
    be:          { label: "BE",          bg: "#141414", color: "#aaa",    border: "#2a2a2a" },
    in_progress: { label: "IN PROGRESS", bg: "#0f1a2e", color: "#4d9fff", border: "#1a3050" },
  };
  const s = map[outcome];
  if (!s) return null;
  return (
    <span style={{
      fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
      padding: "2px 7px", borderRadius: "4px",
      background: s.bg, color: s.color, border: `0.5px solid ${s.border}`,
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>{s.label}</span>
  );
}

function sessionLabel(s) {
  return { london: "London", new_york: "NY", asian: "Asian" }[s] || s;
}

function accountTypeBadge(type) {
  if (type === "personal") return (
    <span style={{
      fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
      padding: "1px 6px", borderRadius: "3px",
      background: "#111", border: "0.5px solid #222",
      color: "#777", textTransform: "uppercase", letterSpacing: "0.06em",
    }}>Personal</span>
  );
  return (
    <span style={{
      fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
      padding: "1px 6px", borderRadius: "3px",
      background: "#0f1a2e", border: "0.5px solid #1a3050",
      color: "#4d9fff", textTransform: "uppercase", letterSpacing: "0.06em",
    }}>Challenge</span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", background: "#111", border: "0.5px solid #1e1e1e",
  borderRadius: "8px", padding: "8px 10px", color: "#ccc",
  fontFamily: "'JetBrains Mono', monospace", fontSize: "13px",
  outline: "none", boxSizing: "border-box",
};

const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

const td = {
  padding: "12px 14px", fontSize: "13px",
  color: "#ccc", verticalAlign: "middle",
};

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{
        fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.1em", textTransform: "uppercase", color: "#777",
      }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: "11px", color: "#999", fontFamily: "'JetBrains Mono', monospace" }}>{hint}</span>}
    </div>
  );
}

// ─── Full-Screen Log / Edit Form ──────────────────────────────────────────────
function TradeForm({ open, onClose, onSave, editTrade, saving, accounts }) {
  // Initialize form directly from editTrade so all fields are pre-populated on mount
  const initForm = editTrade ? {
    pair: editTrade.pair || "EURUSD",
    direction: editTrade.direction || "long",
    entry: editTrade.entry != null && editTrade.entry !== "" ? String(editTrade.entry) : "",
    stop_loss: editTrade.stop_loss != null && editTrade.stop_loss !== "" ? String(editTrade.stop_loss) : "",
    take_profit: editTrade.take_profit != null && editTrade.take_profit !== "" ? String(editTrade.take_profit) : "",
    rr: editTrade.rr != null && editTrade.rr !== "" ? String(editTrade.rr) : "",
    session: editTrade.session || "london",
    date: editTrade.date || new Date().toISOString().split("T")[0],
    notes: editTrade.notes || "",
    screenshot_url: editTrade.screenshot_url || null,
    outcome: editTrade.outcome ?? null,
  } : makeEmptyForm();

  // Pre-calculate risk % from pnl + rr for edit mode
  const initRisk = (() => {
    if (!editTrade) return {};
    const acc = accounts.find(a => a.id === editTrade.account_id);
    let prefilledRisk = "";
    if (acc?.account_size && editTrade.pnl != null && editTrade.rr) {
      const rr = parseFloat(editTrade.rr);
      const pnl = Math.abs(parseFloat(editTrade.pnl));
      const size = parseFloat(acc.account_size);
      if (rr > 0 && size > 0) prefilledRisk = ((pnl / rr / size) * 100).toFixed(2);
    }
    return { [editTrade.account_id]: prefilledRisk };
  })();

  const initSelectedAccounts = editTrade
    ? new Set([editTrade.account_id])
    : (() => {
        const personal = accounts.find(a => a.type === "personal");
        return personal ? new Set([personal.id]) : new Set();
      })();

  const initRiskModes = editTrade
    ? { [editTrade.account_id]: "$" }
    : (() => {
        const personal = accounts.find(a => a.type === "personal");
        return personal ? { [personal.id]: "$" } : {};
      })();

  const [form, setForm] = useState(initForm);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [accountRisks, setAccountRisks] = useState(initRisk);
  const [accountRiskModes, setAccountRiskModes] = useState(initRiskModes);
  const [selectedAccounts, setSelectedAccounts] = useState(initSelectedAccounts);
  // 'manual' = quick-select R:R (default), 'auto' = Entry/SL/TP price mode
  const [rrMode, setRrMode] = useState(() => {
    // If editing a trade that has entry/sl/tp, open in auto mode
    if (editTrade && editTrade.entry && editTrade.stop_loss && editTrade.take_profit) return 'auto';
    return 'manual';
  });
  const fileRef = useRef();

  // On mount (new trade only), pre-fill entry/SL/TP from last trade for the default pair
  useEffect(() => {
    if (editTrade) return;
    prefillPricesForPair(initForm.pair, setForm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function prefillPricesForPair(pair, updater) {
    try {
      const { data } = await supabase
        .from("market_prices")
        .select("price")
        .eq("pair", pair)
        .maybeSingle();
      if (data && data.price && data.price !== 0) {
        const price = String(data.price);
        updater(prev => ({
          ...prev,
          entry: price,
          stop_loss: price,
          take_profit: price,
          rr: "",
        }));
      }
    } catch { /* no price found for this pair */ }
  }

  function set(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === "pair") {
        next.entry = "";
        next.stop_loss = "";
        next.take_profit = "";
        next.rr = "";
      } else if (rrMode === "auto") {
        next.rr = calcRR(
          k === "entry" ? v : next.entry,
          k === "stop_loss" ? v : next.stop_loss,
          k === "take_profit" ? v : next.take_profit,
        );
      }
      return next;
    });
    if (k === "pair" && PAIRS.includes(v.toUpperCase())) {
      prefillPricesForPair(v, setForm);
    }
  }

  function toggleAccount(acc) {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(acc.id)) {
        if (next.size === 1) return prev;
        next.delete(acc.id);
        setAccountRisks(r => { const n = { ...r }; delete n[acc.id]; return n; });
        setAccountRiskModes(m => { const n = { ...m }; delete n[acc.id]; return n; });
      } else {
        next.add(acc.id);
        setAccountRisks(r => ({ ...r, [acc.id]: "" }));
        setAccountRiskModes(m => ({ ...m, [acc.id]: "$" }));
      }
      return next;
    });
  }

  function setRisk(accId, val) {
    setAccountRisks(prev => ({ ...prev, [accId]: val }));
  }

  function switchMode(acc, newMode) {
    const currentMode = accountRiskModes[acc.id] || "$";
    if (currentMode === newMode) return;

    const currentVal = accountRisks[acc.id];
    const size = acc.account_size;
    let converted = "";

    if (currentVal && size) {
      const num = parseFloat(currentVal);
      if (!isNaN(num) && num > 0) {
        if (newMode === "$" && currentMode === "%") {
          // % → $
          converted = ((num / 100) * size).toFixed(2);
        } else if (newMode === "%" && currentMode === "$") {
          // $ → %
          converted = ((num / size) * 100).toFixed(2);
        }
      }
    }

    setAccountRiskModes(m => ({ ...m, [acc.id]: newMode }));
    if (converted) setAccountRisks(r => ({ ...r, [acc.id]: converted }));
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) setScreenshotFile(file);
  }

  async function handleSave() {
    setFormError(null);
    setSuccessMsg(null);
    if (selectedAccounts.size === 0) {
      setFormError("Select at least one account.");
      return;
    }
    const result = await onSave(form, screenshotFile, selectedAccounts, accountRisks, accountRiskModes);
    if (result && result.error) {
      setFormError(result.error);
    } else {
      localStorage.setItem("lastTradePair", form.pair);
      if (!editTrade) {
        setSelectedAccounts(new Set());
        setAccountRisks({});
        setAccountRiskModes({});
      }
      setSuccessMsg(editTrade ? "Trade updated." : "Trade logged successfully.");
      setTimeout(onClose, 1200);
    }
  }

  if (!open) return null;

  const selectedAccountsList = accounts.filter(a => selectedAccounts.has(a.id));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0a0a", display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#0a0a0a", borderBottom: "0.5px solid #1a1a1a",
        padding: "0 40px", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
          {editTrade ? "Edit Trade" : "Log Trade"}
        </span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {successMsg && (
            <span style={{ color: "#1bba7c", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
              ✓ {successMsg}
            </span>
          )}
          {formError && (
            <span style={{ color: "#c03535", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
              {formError}
            </span>
          )}
          <button onClick={onClose} style={{
            padding: "8px 16px", background: "none",
            border: "0.5px solid #1e1e1e", borderRadius: "8px",
            color: "#777", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: "13px",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 22px",
            background: saving ? "#555" : "#fff",
            border: "none", borderRadius: "8px",
            color: saving ? "#777" : "#000",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600,
            transition: "background 0.15s",
          }}>
            {saving ? "Saving…" : "Save Trade"}
          </button>
        </div>
      </div>

      {/* Body — two columns */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: "0", maxWidth: "1200px",
        margin: "0 auto", width: "100%",
        padding: "40px 40px 60px",
        boxSizing: "border-box", alignItems: "start",
      }}>

        {/* ── Left: trade details ── */}
        <div style={{ paddingRight: "48px", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "18px" }}>
              Trade Details
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Pair + Direction */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Pair">
                  <PairCombobox
                    value={form.pair}
                    onChange={v => set("pair", v)}
                  />
                </Field>
                <Field label="Direction">
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["long", "short"].map(d => (
                      <button key={d} onClick={() => set("direction", d)} style={{
                        flex: 1, padding: "8px", borderRadius: "8px",
                        border: form.direction === d
                          ? `0.5px solid ${d === "long" ? "#1a3826" : "#2e1515"}`
                          : "0.5px solid #1e1e1e",
                        background: form.direction === d
                          ? (d === "long" ? "#0f2219" : "#1e0d0d") : "#111",
                        color: form.direction === d
                          ? (d === "long" ? "#1bba7c" : "#c03535") : "#777",
                        cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px", textTransform: "uppercase",
                        letterSpacing: "0.08em", transition: "all 0.15s",
                      }}>{d}</button>
                    ))}
                  </div>
                </Field>
              </div>

              {/* R:R Section — mode toggle */}
              <div>
                {/* Mode toggle header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#777", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {rrMode === "manual" ? "Risk:Reward" : "Entry / SL / TP"}
                  </span>
                  <div style={{ display: "flex", border: "0.5px solid #1e1e1e", borderRadius: "6px", overflow: "hidden" }}>
                    {[["manual", "R:R Select"], ["auto", "Price Mode"]].map(([mode, label]) => (
                      <button key={mode} onClick={() => setRrMode(mode)} style={{
                        padding: "5px 12px", border: "none", cursor: "pointer", fontSize: "10px",
                        fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em",
                        background: rrMode === mode ? "#1bba7c22" : "#111",
                        color: rrMode === mode ? "#1bba7c" : "#555",
                        transition: "all 0.15s",
                      }}>{label}</button>
                    ))}
                  </div>
                </div>

                {rrMode === "manual" ? (
                  /* Quick-select R:R buttons + custom input */
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {["1", "2", "3", "4", "5"].map(n => {
                        const val = n;
                        const active = form.rr === val;
                        return (
                          <button key={n} onClick={() => setForm(prev => ({ ...prev, rr: active ? "" : val }))} style={{
                            flex: 1, padding: "10px 4px", borderRadius: "8px", cursor: "pointer",
                            border: `0.5px solid ${active ? "#1a3826" : "#1e1e1e"}`,
                            background: active ? "#0f2219" : "#111",
                            color: active ? "#1bba7c" : "#666",
                            fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
                            transition: "all 0.15s",
                          }}>1:{n}</button>
                        );
                      })}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <Field label="Custom R:R">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", flexShrink: 0 }}>1:</span>
                          <input type="number" step="0.1" min="0.1" placeholder="2.5"
                            value={form.rr} onChange={e => setForm(prev => ({ ...prev, rr: e.target.value }))}
                            style={{ ...inputStyle }} />
                        </div>
                      </Field>
                      <Field label="Session">
                        <select value={form.session} onChange={e => set("session", e.target.value)} style={selectStyle}>
                          {SESSIONS.map(s => <option key={s} value={s}>{sessionLabel(s)}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                ) : (
                  /* Auto price mode: Entry / SL / TP → R:R auto-calculates */
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                      <Field label="Entry">
                        <input type="number" step="0.00001" placeholder="0.00000"
                          value={form.entry} onChange={e => set("entry", e.target.value)} style={inputStyle} />
                      </Field>
                      <Field label="Stop Loss">
                        <input type="number" step="0.00001" placeholder="0.00000"
                          value={form.stop_loss} onChange={e => set("stop_loss", e.target.value)} style={inputStyle} />
                      </Field>
                      <Field label="Take Profit">
                        <input type="number" step="0.00001" placeholder="0.00000"
                          value={form.take_profit} onChange={e => set("take_profit", e.target.value)} style={inputStyle} />
                      </Field>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <Field label="R:R (auto-calculated)">
                        <input type="text" readOnly
                          value={form.rr ? `1:${form.rr}` : "—"}
                          style={{ ...inputStyle, color: form.rr ? "#1bba7c" : "#999", cursor: "default" }} />
                      </Field>
                      <Field label="Session">
                        <select value={form.session} onChange={e => set("session", e.target.value)} style={selectStyle}>
                          {SESSIONS.map(s => <option key={s} value={s}>{sessionLabel(s)}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <Field label="Date">
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                  style={{ ...inputStyle, maxWidth: "200px" }} />
              </Field>

              {/* Outcome */}
              <Field label="Outcome">
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { value: "win",         label: "WIN",         active: "#0f2219", activeText: "#1bba7c", activeBorder: "#1a3826" },
                    { value: "loss",        label: "LOSS",        active: "#1e0d0d", activeText: "#c03535", activeBorder: "#2e1515" },
                    { value: "be",          label: "BE",          active: "#141414", activeText: "#aaa",    activeBorder: "#2a2a2a" },
                    { value: "in_progress", label: "IN PROGRESS", active: "#0f1a2e", activeText: "#4d9fff", activeBorder: "#1a3050" },
                  ].map(({ value, label, active, activeText, activeBorder }) => {
                    const isActive = form.outcome === value;
                    return (
                      <button key={value} onClick={() => set("outcome", isActive ? null : value)} style={{
                        flex: 1, padding: "8px 4px", borderRadius: "8px",
                        border: `0.5px solid ${isActive ? activeBorder : "#1e1e1e"}`,
                        background: isActive ? active : "#111",
                        color: isActive ? activeText : "#777",
                        cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.08em", transition: "all 0.15s",
                      }}>{label}</button>
                    );
                  })}
                </div>
              </Field>

              {/* Notes */}
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Trade rationale, confluences, lessons learned…" rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: "110px", fontFamily: "'Inter', sans-serif", lineHeight: "1.6", fontSize: "14px" }} />
              </Field>

              {/* Screenshot */}
              <Field label="Chart Screenshot">
                <div onClick={() => fileRef.current.click()} style={{
                  border: "0.5px dashed #2a2a2a", borderRadius: "10px", padding: "28px 20px",
                  cursor: "pointer", textAlign: "center",
                  color: "#999", fontSize: "13px", transition: "border-color 0.15s",
                  fontFamily: "'Inter', sans-serif",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#3a3a3a"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}
                >
                  {screenshotFile
                    ? <span style={{ color: "#1bba7c", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>📎 {screenshotFile.name}</span>
                    : form.screenshot_url
                      ? <span style={{ color: "#4d9fff", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>📎 Screenshot attached — click to replace</span>
                      : <>
                          <div style={{ fontSize: "22px", marginBottom: "8px" }}>📷</div>
                          <div style={{ color: "#777" }}>Click to upload chart screenshot</div>
                          <div style={{ color: "#555", fontSize: "11px", marginTop: "4px" }}>PNG, JPG, WEBP</div>
                        </>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Right: account selector ── */}
        <div style={{
          borderLeft: "0.5px solid #1a1a1a", paddingLeft: "40px",
          display: "flex", flexDirection: "column", gap: "20px",
          position: "sticky", top: "80px",
        }}>
          <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Accounts
          </div>
          <div style={{ fontSize: "12px", color: "#999", fontFamily: "'Inter', sans-serif", marginTop: "-10px" }}>
            Select which accounts took this trade. Each account uses its own risk sizing.
          </div>

          {accounts.map(acc => {
            const isSelected = selectedAccounts.has(acc.id);
            const mode = accountRiskModes[acc.id] || "$";
            const rawVal = accountRisks[acc.id] || "";

            // Resolve both % and $ for the preview
            let resolvedPct = null;
            let resolvedDollar = null;
            const num = parseFloat(rawVal);
            if (!isNaN(num) && num > 0 && acc.account_size) {
              if (mode === "%") {
                resolvedPct = num;
                resolvedDollar = ((num / 100) * acc.account_size).toFixed(2);
              } else {
                resolvedDollar = num.toFixed(2);
                resolvedPct = ((num / acc.account_size) * 100).toFixed(2);
              }
            }
            const pnl = resolvedPct ? calcPnl(resolvedPct, acc.account_size, form.rr, form.outcome) : null;
            const pnlNum = pnl !== null ? parseFloat(pnl) : null;

            return (
              <div key={acc.id} style={{
                background: isSelected ? "#0f0f0f" : "#080808",
                border: `0.5px solid ${isSelected ? "#2a2a2a" : "#141414"}`,
                borderRadius: "12px", padding: "16px",
                transition: "all 0.15s", cursor: "pointer",
                opacity: isSelected ? 1 : 0.5,
              }}
                onClick={() => toggleAccount(acc)}
              >
                {/* Account header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isSelected ? "14px" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Checkbox */}
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "4px",
                      border: `0.5px solid ${isSelected ? "#1bba7c" : "#2a2a2a"}`,
                      background: isSelected ? "#0f2219" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.15s",
                    }}>
                      {isSelected && <span style={{ color: "#1bba7c", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#e0e0e0" }}>
                        {acc.name}
                      </span>
                      {accountTypeBadge(acc.type)}
                      {acc.account_size && (
                        <span style={{ fontSize: "10px", color: "#999", fontFamily: "'JetBrains Mono', monospace" }}>
                          ${parseFloat(acc.account_size).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Risk input — only when selected */}
                {isSelected && (
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

                    {/* Risk input with % / $ toggle */}
                    <div>
                      <label style={{
                        fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.1em", textTransform: "uppercase", color: "#777",
                        display: "block", marginBottom: "6px",
                      }}>Risk</label>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {/* Mode toggle pill */}
                        <div style={{
                          display: "flex", borderRadius: "6px",
                          border: "0.5px solid #1e1e1e", overflow: "hidden", flexShrink: 0,
                        }}>
                          {["$", "%"].map(m => {
                            const active = mode === m;
                            return (
                              <button
                                key={m}
                                onClick={() => switchMode(acc, m)}
                                style={{
                                  padding: "7px 13px", border: "none", cursor: "pointer",
                                  background: active ? "#1e1e1e" : "transparent",
                                  color: active ? "#e0e0e0" : "#777",
                                  fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
                                  transition: "all 0.15s", lineHeight: 1,
                                }}
                              >{m}</button>
                            );
                          })}
                        </div>

                        {/* Value input */}
                        <div style={{ position: "relative", flex: 1 }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder={mode === "%" ? "1.0" : "100"}
                            value={rawVal}
                            onChange={e => setRisk(acc.id, e.target.value)}
                            style={{ ...inputStyle, paddingRight: "28px" }}
                          />
                          <span style={{
                            position: "absolute", right: "10px", top: "50%",
                            transform: "translateY(-50%)",
                            color: "#777", fontSize: "12px",
                            fontFamily: "'JetBrains Mono', monospace", pointerEvents: "none",
                          }}>{mode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live preview: Risk % + Risk $ + Est. P&L */}
                    <div style={{
                      background: "#0a0a0a", border: "0.5px solid #1a1a1a",
                      borderRadius: "8px", padding: "10px 12px",
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px",
                    }}>
                      <div>
                        <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                          Risk %
                        </div>
                        <div style={{ fontSize: "14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: resolvedPct ? "#e0e0e0" : "#555" }}>
                          {resolvedPct ? `${parseFloat(resolvedPct).toFixed(2)}%` : "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                          Risk $
                        </div>
                        <div style={{ fontSize: "14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: resolvedDollar ? "#e0e0e0" : "#555" }}>
                          {resolvedDollar ? `$${resolvedDollar}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                          Est. P&L
                        </div>
                        <div style={{ fontSize: "14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: pnlNum !== null ? pnlColor(pnlNum) : "#555" }}>
                          {pnlNum !== null ? `${pnlNum >= 0 ? "+" : ""}$${Math.abs(pnlNum).toFixed(2)}` : "—"}
                        </div>
                      </div>
                    </div>

                    {!form.rr && rawVal && (
                      <div style={{ fontSize: "11px", color: "#999", fontFamily: "'JetBrains Mono', monospace" }}>
                        Fill Entry, SL, TP to calculate P&L
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary of selected accounts */}
          {selectedAccounts.size > 1 && (
            <div style={{
              background: "#0a0a0a", border: "0.5px solid #1a1a1a",
              borderRadius: "10px", padding: "14px 16px",
            }}>
              <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                Summary
              </div>
              {selectedAccountsList.map(acc => {
                const mode = accountRiskModes[acc.id] || "$";
                const rawVal = accountRisks[acc.id] || "";
                const num = parseFloat(rawVal);
                let resolvedPct = null;
                if (!isNaN(num) && num > 0 && acc.account_size) {
                  resolvedPct = mode === "%" ? num : (num / acc.account_size) * 100;
                }
                const pnl = resolvedPct ? calcPnl(resolvedPct, acc.account_size, form.rr, form.outcome) : null;
                const pnlNum = pnl !== null ? parseFloat(pnl) : null;
                return (
                  <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontFamily: "'Inter', sans-serif", color: "#aaa" }}>{acc.name}</span>
                    <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: pnlNum !== null ? pnlColor(pnlNum) : "#555" }}>
                      {pnlNum !== null ? `${pnlNum >= 0 ? "+" : ""}$${Math.abs(pnlNum).toFixed(2)}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trade Detail Modal ────────────────────────────────────────────────────────
function TradeDetailModal({ trade, onClose, onEdit, onDelete }) {
  if (!trade) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        zIndex: 300, backdropFilter: "blur(2px)",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(860px, 92vw)", maxHeight: "88vh",
        background: "#0d0d0d", border: "0.5px solid #1e1e1e",
        borderRadius: "16px", zIndex: 301,
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 28px 20px", borderBottom: "0.5px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#0d0d0d", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
              {trade.pair}
            </span>
            {directionBadge(trade.direction)}
            {outcomeBadge(trade.outcome)}
            <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#777" }}>{trade.date}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => { onClose(); onEdit(trade); }} style={{
              padding: "7px 14px", borderRadius: "7px",
              border: "0.5px solid #1e1e1e", background: "none",
              color: "#aaa", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: "13px",
            }}>Edit</button>
            <button onClick={() => { onClose(); onDelete(trade.id); }} style={{
              padding: "7px 14px", borderRadius: "7px",
              border: "0.5px solid #2e1515", background: "#1e0d0d",
              color: "#c03535", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: "13px",
            }}>Delete</button>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: "#777",
              cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: "2px 6px",
            }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Stats row */}
          <div style={{
            display: "flex", gap: "1px", background: "#1a1a1a",
            borderRadius: "10px", overflow: "hidden", border: "0.5px solid #1a1a1a",
          }}>
            {[
              { label: "P&L", value: trade.pnl != null ? `${parseFloat(trade.pnl) >= 0 ? "+" : ""}${fmt(trade.pnl)}` : "—", color: pnlColor(trade.pnl) },
              { label: "R:R", value: trade.rr ? `${trade.rr}R` : "—" },
              { label: "Swap", value: trade.swap != null ? `${parseFloat(trade.swap) >= 0 ? "+" : ""}${fmt(trade.swap)}` : "—", color: trade.swap != null ? pnlColor(trade.swap) : "#777" },
              { label: "Commission", value: trade.commission != null ? `${parseFloat(trade.commission) >= 0 ? "+" : ""}${fmt(trade.commission)}` : "—", color: trade.commission != null ? pnlColor(trade.commission) : "#777" },
              { label: "Session", value: sessionLabel(trade.session) },
              { label: "Entry", value: fmt(trade.entry) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: "16px 20px", background: "#0f0f0f" }}>
                <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#777", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{s.label}</div>
                <div style={{ fontSize: "20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: s.color || "#e0e0e0" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Price levels */}
          <div>
            <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Price Levels</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {[
                { label: "Entry", value: fmt(trade.entry) },
                { label: "Stop Loss", value: fmt(trade.stop_loss) },
                { label: "Take Profit", value: fmt(trade.take_profit) },
              ].map(item => (
                <div key={item.label} style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#777", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>{item.label}</div>
                  <div style={{ fontSize: "15px", fontFamily: "'JetBrains Mono', monospace", color: "#ccc" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot */}
          {trade.screenshot_url && (
            <div>
              <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Chart Screenshot</div>
              <div style={{ borderRadius: "10px", overflow: "hidden", border: "0.5px solid #1e1e1e", background: "#111", position: "relative" }}>
                <img src={trade.screenshot_url} alt="Trade screenshot" style={{ width: "100%", display: "block", maxHeight: "460px", objectFit: "contain", background: "#0a0a0a" }} />
                <a href={trade.screenshot_url} target="_blank" rel="noreferrer" style={{
                  position: "absolute", bottom: "12px", right: "12px",
                  background: "rgba(0,0,0,0.7)", border: "0.5px solid #2a2a2a",
                  borderRadius: "6px", padding: "5px 10px",
                  color: "#4d9fff", fontSize: "11px",
                  fontFamily: "'JetBrains Mono', monospace", textDecoration: "none",
                }}>Open full size ↗</a>
              </div>
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <div>
              <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Notes</div>
              <div style={{
                background: "#111", border: "0.5px solid #1e1e1e",
                borderRadius: "10px", padding: "16px 18px",
                color: "#999", fontSize: "14px",
                fontFamily: "'Inter', sans-serif", lineHeight: "1.65",
                whiteSpace: "pre-wrap",
              }}>{trade.notes}</div>
            </div>
          )}

          {!trade.screenshot_url && !trade.notes && (
            <div style={{ textAlign: "center", color: "#555", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", padding: "16px" }}>
              No screenshot or notes attached to this trade.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Trade Row ────────────────────────────────────────────────────────────────
function TradeRow({ trade, onViewDetail, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={() => onViewDetail(trade)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer", borderBottom: "0.5px solid #161616", transition: "background 0.1s",
        background: hovered ? "rgba(255,255,255,0.02)" : "transparent",
      }}
    >
      <td style={{ ...td, fontFamily: "'JetBrains Mono', monospace", color: "#999" }}>{trade.date}</td>
      <td style={{ ...td, fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 700, color: "#e0e0e0" }}>{trade.pair}</td>
      <td style={td}>{outcomeBadge(trade.outcome) || <span style={{ color: "#555" }}>—</span>}</td>
      <td style={td}>{directionBadge(trade.direction)}</td>
      <td style={{ ...td, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#aaa" }}>{fmt(trade.entry)}</td>
      <td style={{ ...td, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#aaa" }}>{trade.rr ? `${trade.rr}R` : "—"}</td>
      <td style={{ ...td, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: trade.swap != null ? pnlColor(trade.swap) : "#555" }}>
        {trade.swap != null ? `${parseFloat(trade.swap) >= 0 ? "+" : ""}${fmt(trade.swap)}` : "—"}
      </td>
      <td style={{ ...td, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: trade.commission != null ? pnlColor(trade.commission) : "#555" }}>
        {trade.commission != null ? `${parseFloat(trade.commission) >= 0 ? "+" : ""}${fmt(trade.commission)}` : "—"}
      </td>
      <td style={{ ...td, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 700, color: pnlColor(trade.pnl) }}>
        {trade.pnl != null ? `${parseFloat(trade.pnl) >= 0 ? "+" : ""}${fmt(trade.pnl)}` : "—"}
      </td>
      <td style={{ ...td, textAlign: "center", color: "#777", fontSize: "11px", fontWeight: 700, opacity: 0.7 }}>{sessionLabel(trade.session)}</td>
      <td style={{ ...td, textAlign: "right" }}>
        <div style={{
          display: "flex", gap: "8px", justifyContent: "flex-end",
          opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
        }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(trade)} style={{
            width: "28px", height: "28px", borderRadius: "6px", border: "none",
            background: "rgba(255,255,255,0.05)", color: "#ccc",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}><Pencil size={14} /></button>
          <button onClick={() => onDelete(trade.id)} style={{
            width: "28px", height: "28px", borderRadius: "6px", border: "none",
            background: "rgba(192,53,53,0.1)", color: "#c03535",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}><X size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── Mobile Account Dropdown Row ─────────────────────────────────────────────
// ─── CSV Import Modal ─────────────────────────────────────────────────────────

// Normalize a header string: lowercase, remove spaces/underscores/dashes/dots
function normalizeKey(str) {
  return str.toLowerCase().replace(/[\s_\-./\\]/g, "");
}

// Aliases for each target field (all pre-normalized)
const FIELD_ALIASES = {
  pair:        ["symbol","instrument","market","ticker","pair","currency","currencypair","asset"],
  direction:   ["type","side","direction","action","ordertype","tradetype","buysell","bs"],
  entry:       ["openprice","entryprice","open","entry","openrate","entryrate","fillprice","execprice","executionprice","openprice","price"],
  stop_loss:   ["sl","stoploss","stop","stoplosslevel","stoplossrate","slprice"],
  take_profit: ["tp","takeprofit","target","takeprofitlevel","takeprofitrate","tpprice","profittarget"],
  pnl:         ["profit","pl","pandl","netpl","netprofit","nettprofit","grosspnl","netpnl","realizedpnl","closedpnl","gainloss","result","return"],
  commission:  ["commission","commissions","comm","fee","fees","brokerfee","tradingfee","execfee"],
  swap:        ["swap","swaps","overnight","rollover","overnightfee","swapfee","financing","financingfee","interest"],
  date:        ["opentime","entrytime","opendate","entrydate","date","closetime","closedate","tradetime","tradedate","datetime","timestamp","time","opendatetime"],
  time:        ["time","tradetime","opentime","entrytime"],
};

// Does a value look like a date or datetime string?
// Matches "2026-03-30", "2026.03.30 15:05:49", "30/03/2026 15:05", etc.
function looksLikeDatetime(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (!s) return false;
  return (
    /^\d{4}[-./]\d{2}[-./]\d{2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(s) ||
    /^\d{2}\/\d{2}\/\d{4}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(s)
  );
}

// Find the value from a row for a target field using fuzzy alias matching.
// If excludeDatetime is true, skip matches whose value looks like a date/time
// (used for numeric fields, since some broker exports reuse names like "Open"
// for both an open-time column and an open-price column).
function fuzzyGet(row, field, { excludeDatetime = false } = {}) {
  const aliases = FIELD_ALIASES[field] || [];
  for (const [rawKey, val] of Object.entries(row)) {
    const nk = normalizeKey(rawKey);
    if (aliases.includes(nk)) {
      if (excludeDatetime && looksLikeDatetime(val)) continue;
      return val;
    }
  }
  return null;
}

// Parse a date/time string into { date, time }
function parseDatetime(raw) {
  if (!raw) return { date: null, time: null };
  const str = String(raw).trim();
  // Try "YYYY.MM.DD HH:MM" or "YYYY-MM-DD HH:MM:SS" or "DD/MM/YYYY HH:MM"
  const spaceIdx = str.indexOf(" ");
  if (spaceIdx > -1) {
    let datePart = str.slice(0, spaceIdx);
    const timePart = str.slice(spaceIdx + 1).slice(0, 8); // HH:MM:SS max
    // Normalize dots to dashes
    datePart = datePart.replace(/\./g, "-");
    // Handle DD/MM/YYYY → YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
      const [d, m, y] = datePart.split("/");
      datePart = `${y}-${m}-${d}`;
    }
    return { date: datePart, time: timePart || null };
  }
  // No space — just a date
  let datePart = str.replace(/\./g, "-");
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
    const [d, m, y] = datePart.split("/");
    datePart = `${y}-${m}-${d}`;
  }
  return { date: datePart, time: null };
}

// Normalize direction string → "long" | "short" | null
function parseDirection(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s.includes("buy") || s === "long" || s === "b" || s === "1") return "long";
  if (s.includes("sell") || s === "short" || s === "s" || s === "-1") return "short";
  return null;
}

// Map a single raw CSV row → normalized trade object
function fuzzyMapRow(row) {
  // Date — try dedicated date/datetime field first via header alias matching
  let rawDate = fuzzyGet(row, "date");

  // Fallback: some exports (e.g. MT5) just label columns "Open" / "Close"
  // with no "time" or "date" in the name at all. In that case, scan every
  // column's *value* for something that looks like a date/datetime, and
  // prefer one whose header suggests the open/entry side of the trade.
  if (!rawDate || !looksLikeDatetime(rawDate)) {
    const candidates = Object.entries(row).filter(([, v]) => looksLikeDatetime(v));
    if (candidates.length) {
      const preferred =
        candidates.find(([h]) => /open|entry|start/i.test(h)) || candidates[0];
      rawDate = preferred[1];
    }
  }

  const { date, time } = parseDatetime(rawDate);

  const pnlRaw = fuzzyGet(row, "pnl", { excludeDatetime: true });
  const pnl = pnlRaw !== null && pnlRaw !== "" ? parseFloat(pnlRaw) : null;
  const outcome = pnl === null ? null : pnl > 0 ? "win" : pnl < 0 ? "loss" : "be";

  const commRaw = fuzzyGet(row, "commission", { excludeDatetime: true });
  const swapRaw = fuzzyGet(row, "swap", { excludeDatetime: true });

  const pairRaw = fuzzyGet(row, "pair");
  const entryRaw = fuzzyGet(row, "entry", { excludeDatetime: true });
  const slRaw = fuzzyGet(row, "stop_loss", { excludeDatetime: true });
  const tpRaw = fuzzyGet(row, "take_profit", { excludeDatetime: true });
  const dirRaw = fuzzyGet(row, "direction");

  return {
    pair: pairRaw ? String(pairRaw).toUpperCase().trim() : null,
    direction: parseDirection(dirRaw),
    entry: entryRaw !== null && entryRaw !== "" ? parseFloat(entryRaw) || null : null,
    stop_loss: slRaw !== null && slRaw !== "" ? parseFloat(slRaw) || null : null,
    take_profit: tpRaw !== null && tpRaw !== "" ? parseFloat(tpRaw) || null : null,
    pnl: isNaN(pnl) ? null : pnl,
    commission: commRaw !== null && commRaw !== "" ? parseFloat(commRaw) || null : null,
    swap: swapRaw !== null && swapRaw !== "" ? parseFloat(swapRaw) || null : null,
    outcome,
    date: date || null,
    time: time || null,
  };
}

// Detect which fields were successfully mapped, based on the actual mapped
// rows (not just header names) — this way the coverage pills reflect what
// will really get imported, including fields filled via fallback logic.
function detectMappingCoverage(mapped) {
  const fields = ["pair","direction","entry","stop_loss","take_profit","pnl","commission","swap","date","time"];
  const coverage = {};
  for (const field of fields) {
    coverage[field] = mapped.some(r => r[field] !== null && r[field] !== "" && r[field] !== undefined);
  }
  return coverage;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  // Parse headers preserving original casing for display, but also store raw.
  // Strip a leading BOM (common in CSVs saved from Excel) from the first header.
  const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").replace(/^\uFEFF/, ""));
  // De-duplicate repeated header names (e.g. MT5 exports use "Price" for both
  // open price and close price) so neither column's data gets overwritten.
  const seen = {};
  const headers = rawHeaders.map(h => {
    const key = h || "column";
    if (seen[key] === undefined) { seen[key] = 0; return key; }
    seen[key] += 1;
    return `${key}_${seen[key] + 1}`;
  });
  const rows = lines.slice(1).map(line => {
    const cols = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, "").trim(); });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ""));
  return { headers, rows };
}

function CSVImportModal({ open, onClose, activeAccount, onImported }) {
  const [stage, setStage] = useState("upload"); // upload | preview | importing | done
  const [preview, setPreview] = useState([]);
  const [coverage, setCoverage] = useState({});
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState(null);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef();

  function reset() {
    setStage("upload");
    setPreview([]);
    setCoverage({});
    setTotalRows(0);
    setError(null);
    setImportCount(0);
  }

  function handleClose() { reset(); onClose(); }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const { headers, rows } = parseCSV(text);
      if (!headers.length || !rows.length) {
        setError("The file appears to be empty or unreadable.");
        return;
      }
      const mapped = rows.map(r => fuzzyMapRow(r)).filter(r => r.pair || r.pnl !== null);
      if (!mapped.length) {
        setError("No valid trades found. Make sure the CSV has at least a symbol/pair column or a profit/P&L column.");
        return;
      }
      const cov = detectMappingCoverage(mapped);
      setCoverage(cov);
      setTotalRows(rows.length);
      setPreview(mapped);
      setStage("preview");
    };
    reader.readAsText(file);
  }

  async function handleConfirm() {
    if (!activeAccount) return;
    setStage("importing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const records = preview.map(t => ({
        user_id: user.id,
        account_id: activeAccount.id,
        pair: t.pair,
        direction: t.direction,
        entry: t.entry,
        stop_loss: t.stop_loss,
        take_profit: t.take_profit,
        pnl: t.pnl,
        commission: t.commission,
        swap: t.swap,
        outcome: t.outcome,
        date: t.date,
        time: t.time,
        rr: null,
        session: null,
        notes: null,
        screenshot_url: null,
      }));
      const { error: insertError } = await supabase.from("trades").insert(records);
      if (insertError) throw insertError;
      setImportCount(records.length);
      setStage("done");
      onImported();
    } catch (err) {
      setError("Import failed: " + (err.message || "Unknown error"));
      setStage("preview");
    }
  }

  if (!open) return null;

  // Fields we warn about if missing
  const IMPORTANT_FIELDS = ["pair", "direction", "entry", "pnl", "date"];
  const missingImportant = IMPORTANT_FIELDS.filter(f => !coverage[f]);

  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.7)", display: "flex",
    alignItems: "center", justifyContent: "center",
    padding: "20px",
  };
  const modalStyle = {
    background: "#0d0d0d", border: "0.5px solid #1e1e1e",
    borderRadius: "12px", width: "100%", maxWidth: "760px",
    maxHeight: "85vh", display: "flex", flexDirection: "column",
    overflow: "hidden",
  };

  const tdStyle = { padding: "7px 10px", color: "#aaa", whiteSpace: "nowrap", fontSize: "11px" };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
              Import CSV
            </span>
            {activeAccount && (
              <div style={{ fontSize: "11px", color: "#555", fontFamily: "'JetBrains Mono', monospace", marginTop: "3px" }}>
                → {activeAccount.name}
              </div>
            )}
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "0.5px solid #1e1e1e", borderRadius: "6px", padding: "6px 14px", color: "#777", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px" }}>
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* UPLOAD stage */}
          {stage === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#777", fontFamily: "'Inter', sans-serif", lineHeight: "1.6" }}>
                Upload a trade history CSV from any broker platform — MT4, MT5, cTrader, DXtrade, Match Trader, or any custom export. PropJournal will automatically detect the columns.
              </p>
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: "0.5px dashed #2a2a2a", borderRadius: "10px", padding: "40px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#3a3a3a"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}
              >
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📂</div>
                <div style={{ fontSize: "14px", color: "#aaa", fontFamily: "'Inter', sans-serif" }}>Click to select CSV file</div>
                <div style={{ fontSize: "11px", color: "#555", fontFamily: "'JetBrains Mono', monospace", marginTop: "6px" }}>.csv files only</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
              {error && (
                <div style={{ background: "#1e0d0d", border: "0.5px solid #2e1515", borderRadius: "8px", padding: "12px 14px", color: "#c03535", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* PREVIEW stage */}
          {stage === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Summary row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "#777", fontFamily: "'JetBrains Mono', monospace" }}>
                  {preview.length} of {totalRows} row{totalRows !== 1 ? "s" : ""} mapped
                </span>
                {/* Field coverage pills */}
                {Object.entries(coverage).map(([field, found]) => (
                  <span key={field} style={{
                    fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
                    padding: "2px 7px", borderRadius: "4px", letterSpacing: "0.06em",
                    background: found ? "#0f2219" : "#1e0d0d",
                    color: found ? "#1bba7c" : "#c03535",
                    border: `0.5px solid ${found ? "#1a3826" : "#2e1515"}`,
                  }}>
                    {found ? "✓" : "✗"} {field.replace("_", " ")}
                  </span>
                ))}
              </div>

              {/* Warning if important fields missing */}
              {missingImportant.length > 0 && (
                <div style={{ background: "#1a1200", border: "0.5px solid #2a1e00", borderRadius: "8px", padding: "10px 14px", color: "#c97a00", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                  ⚠ Could not detect: <strong>{missingImportant.join(", ")}</strong>. These fields will be empty. You can edit individual trades after importing.
                </div>
              )}

              {error && (
                <div style={{ background: "#1e0d0d", border: "0.5px solid #2e1515", borderRadius: "8px", padding: "10px 14px", color: "#c03535", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                  {error}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
                  <thead>
                    <tr>
                      {["Date", "Pair", "Dir", "Entry", "SL", "TP", "P&L", "Comm", "Swap", "Outcome"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "#555", fontWeight: 500, borderBottom: "0.5px solid #1a1a1a", whiteSpace: "nowrap", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((t, i) => {
                      const pnlNum = t.pnl !== null ? parseFloat(t.pnl) : null;
                      const commNum = t.commission !== null ? parseFloat(t.commission) : null;
                      const swapNum = t.swap !== null ? parseFloat(t.swap) : null;
                      return (
                        <tr key={i} style={{ borderBottom: "0.5px solid #111" }}>
                          <td style={{ ...tdStyle, color: "#777" }}>{t.date || "—"}</td>
                          <td style={{ ...tdStyle, color: "#ccc" }}>{t.pair || "—"}</td>
                          <td style={tdStyle}>
                            {t.direction
                              ? <span style={{ color: t.direction === "long" ? "#1bba7c" : "#c03535", textTransform: "uppercase" }}>{t.direction}</span>
                              : "—"}
                          </td>
                          <td style={tdStyle}>{t.entry ?? "—"}</td>
                          <td style={tdStyle}>{t.stop_loss ?? "—"}</td>
                          <td style={tdStyle}>{t.take_profit ?? "—"}</td>
                          <td style={{ ...tdStyle, color: pnlNum !== null ? pnlColor(pnlNum) : "#555" }}>
                            {pnlNum !== null ? `${pnlNum >= 0 ? "+" : ""}$${Math.abs(pnlNum).toFixed(2)}` : "—"}
                          </td>
                          <td style={{ ...tdStyle, color: commNum !== null ? "#c97a00" : "#555" }}>
                            {commNum !== null ? `$${commNum.toFixed(2)}` : "—"}
                          </td>
                          <td style={{ ...tdStyle, color: swapNum !== null ? "#4d9fff" : "#555" }}>
                            {swapNum !== null ? `$${swapNum.toFixed(2)}` : "—"}
                          </td>
                          <td style={tdStyle}>{t.outcome ? outcomeBadge(t.outcome) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IMPORTING stage */}
          {stage === "importing" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "28px", marginBottom: "14px" }}>⏳</div>
              <div style={{ fontSize: "14px", color: "#aaa", fontFamily: "'Inter', sans-serif" }}>Importing trades…</div>
            </div>
          )}

          {/* DONE stage */}
          {stage === "done" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "36px", marginBottom: "14px" }}>✅</div>
              <div style={{ fontSize: "16px", color: "#1bba7c", fontFamily: "'Inter', sans-serif", fontWeight: 700, marginBottom: "8px" }}>
                {importCount} trade{importCount !== 1 ? "s" : ""} imported
              </div>
              <div style={{ fontSize: "13px", color: "#777", fontFamily: "'Inter', sans-serif" }}>
                All trades logged under <span style={{ color: "#ccc" }}>{activeAccount?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(stage === "preview" || stage === "done") && (
          <div style={{ padding: "16px 24px", borderTop: "0.5px solid #1a1a1a", display: "flex", justifyContent: "flex-end", gap: "10px", flexShrink: 0 }}>
            {stage === "preview" && (
              <>
                <button onClick={reset} style={{ padding: "9px 18px", background: "none", border: "0.5px solid #1e1e1e", borderRadius: "8px", color: "#777", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px" }}>
                  Back
                </button>
                <button onClick={handleConfirm} style={{ padding: "9px 22px", background: "oklch(0.72 0.17 152)", border: "none", borderRadius: "8px", color: "#000", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "oklch(0.78 0.17 152)"}
                  onMouseLeave={e => e.currentTarget.style.background = "oklch(0.72 0.17 152)"}
                >
                  Import {preview.length} Trade{preview.length !== 1 ? "s" : ""}
                </button>
              </>
            )}
            {stage === "done" && (
              <button onClick={handleClose} style={{ padding: "9px 22px", background: "#fff", border: "none", borderRadius: "8px", color: "#000", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600 }}>
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileAccountRow({ accounts, activeAccount, onSwitch, onImport }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: '52px', left: 0, right: 0,
      background: '#0a0a0a', borderBottom: '0.5px solid #111',
      padding: '7px 14px', zIndex: 199, height: '48px', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Account dropdown pill */}
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#141414', border: '0.5px solid #222',
            borderRadius: '6px', padding: '5px 9px', cursor: 'pointer',
          }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1bba7c', flexShrink: 0 }} />
          <span style={{
            fontSize: '12px', fontWeight: '500', color: '#ccc',
            fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
            maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {activeAccount?.name || 'Select Account'}
          </span>
          {/* Chevron */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="#777" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown */}
        {open && accounts.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            background: '#111', border: '0.5px solid #1e1e1e',
            borderRadius: '8px', overflow: 'hidden', zIndex: 300,
            minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            {accounts.map(acc => {
              const isActive = activeAccount?.id === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => { onSwitch(acc); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 12px', background: isActive ? '#0f2219' : 'transparent',
                    border: 'none', borderBottom: '0.5px solid #161616',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#1bba7c' : '#555', flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: '12px', fontWeight: '500',
                    color: isActive ? '#1bba7c' : '#aaa',
                    fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
                  }}>{acc.name}</span>
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="#1bba7c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Import CSV button */}
      {onImport && (
        <button onClick={onImport} style={{
          background: "none", border: "0.5px solid #1e1e1e",
          borderRadius: "6px", padding: "5px 10px", cursor: "pointer",
          color: "#777", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
          whiteSpace: "nowrap",
        }}>↑ CSV</button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TradeLog() {
  const { collapsed } = useSidebar();
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [filterDir, setFilterDir] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [detailTrade, setDetailTrade] = useState(null);
  const [loggableAccounts, setLoggableAccounts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [importOpen, setImportOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Open Log Trade form when navigated here from the + button
const location = useLocation();
useEffect(() => {
  if (location.state?.openForm) {
    setEditTrade(null);
    setFormOpen(true);
    // Clear the state so re-renders don't re-open it
    window.history.replaceState({}, '');
  }
}, [location.state]);

  // ── Fetch accounts ──
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          // Fetch trades to compute challenge statuses
          const challengeIds = data.filter(a => a.type === "challenge").map(a => a.id);
          let tradesByAccount = {};
          if (challengeIds.length > 0) {
            const { data: trades } = await supabase
              .from("trades").select("*").in("account_id", challengeIds);
            (trades || []).forEach(t => {
              if (!tradesByAccount[t.account_id]) tradesByAccount[t.account_id] = [];
              tradesByAccount[t.account_id].push(t);
            });
          }
          const computeStatus = (trades, account) => {
            if (account.failure_reason) return 'failed';
            if (account.phase === 'funded') return 'funded';
            const withPnl = trades.filter(t => t.pnl != null);
            const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0);
            const accountSize = parseFloat(account.account_size) || 0;
            const profitTarget = parseFloat(account.profit_target) || 0;
            const maxDD = parseFloat(account.max_drawdown) || 0;
            const dailyDD = parseFloat(account.daily_drawdown) || 0;
            const minDays = account.min_trading_days || 0;
            let balance = accountSize;
            let lowestBalance = accountSize;
            for (const t of withPnl) {
              balance += parseFloat(t.pnl);
              if (balance < lowestBalance) lowestBalance = balance;
            }
            const maxDrawdownUsed = Math.max(0, accountSize - lowestBalance);
            const byDay = {};
            withPnl.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + parseFloat(t.pnl); });
            const worstDayLoss = Object.values(byDay).length > 0
              ? Math.max(0, ...Object.values(byDay).map(v => -v)) : 0;
            if ((maxDD > 0 && maxDrawdownUsed >= maxDD) || (dailyDD > 0 && worstDayLoss >= dailyDD)) return 'failed';
            const tradingDays = new Set(trades.map(t => t.date)).size;
            if (profitTarget > 0 && netPnl >= profitTarget && (minDays === 0 || tradingDays >= minDays)) return 'passed';
            return 'active';
          };
          // All accounts shown in switcher (history viewing)
          setAccounts(data);
          // Only active/funded challenges available when logging a trade
          const loggableAccounts = data.filter(a => {
            if (a.type === 'personal') return true;
            const status = computeStatus(tradesByAccount[a.id] || [], a);
            return status === 'active' || status === 'funded';
          });
          setLoggableAccounts(loggableAccounts);
          // Default to last selected account, fallback to first
          const savedId = localStorage.getItem('activeAccountId');
          const preferred = savedId ? (data.find(a => a.id === savedId) || data[0]) : data[0];
          setActiveAccount(preferred || null);
        }
      } catch {
        setError("Failed to load accounts.");
      }
    };
    fetchAccounts();
  }, []);

  // ── Fetch trades on active account change ──
  useEffect(() => {
    if (!activeAccount) return;
    fetchTrades(activeAccount.id);
  }, [activeAccount]);

  async function fetchTrades(accountId) {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("account_id", accountId)
        .order("date", { ascending: false });
      if (error) throw error;
      setTrades(data || []);
    } catch {
      setError("Failed to load trades.");
    } finally {
      setLoading(false);
    }
  }

  // ── Upload screenshot ──
  async function uploadScreenshot(file, tradeId, accountId) {
    const ext = file.name.split(".").pop();
    const path = `screenshots/${accountId}/${tradeId}.${ext}`;
    const { error } = await supabase.storage
      .from("trade-screenshots")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
    return data.publicUrl;
  }

  // ── Save: inserts one row per selected account ──
  async function handleSave(form, screenshotFile, selectedAccounts, accountRisks, accountRiskModes) {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedIds = [...selectedAccounts];

      let sharedScreenshotUrl = form.screenshot_url || null;
      let screenshotUploaded = false;

      if (editTrade) {
        // Edit: update the one trade row
        const accId = editTrade.account_id;
        const acc = accounts.find(a => a.id === accId);
        const riskPct = resolveRiskPct(accId, accountRisks, accountRiskModes, accounts);
        const pnl = calcPnl(riskPct, acc?.account_size, form.rr, form.outcome);

        if (screenshotFile) {
          sharedScreenshotUrl = await uploadScreenshot(screenshotFile, editTrade.id, accId);
        }

        const { error } = await supabase.from("trades").update({
          pair: form.pair,
          direction: form.direction,
          entry: form.entry !== "" && form.entry != null ? parseFloat(form.entry) : null,
          stop_loss: form.stop_loss !== "" && form.stop_loss != null ? parseFloat(form.stop_loss) : null,
          take_profit: form.take_profit !== "" && form.take_profit != null ? parseFloat(form.take_profit) : null,
          rr: form.rr !== "" && form.rr != null ? parseFloat(form.rr) : null,
          pnl: pnl !== null ? parseFloat(pnl) : null,
          session: form.session,
          date: form.date,
          notes: form.notes,
          screenshot_url: sharedScreenshotUrl,
          outcome: form.outcome || null,
        }).eq("id", editTrade.id);
        if (error) throw error;

        // Fire notification checks after a successful edit
        await checkAndInsertNotifications(accId, user.id, form.date);

      } else {
        // New: insert one row per selected account
        for (const accId of selectedIds) {
          const acc = accounts.find(a => a.id === accId);
          const riskPct = resolveRiskPct(accId, accountRisks, accountRiskModes, accounts);
          const pnl = calcPnl(riskPct, acc?.account_size, form.rr, form.outcome);

          const { data: inserted, error: insertError } = await supabase
            .from("trades")
            .insert({
              user_id: user.id,
              account_id: accId,
              pair: form.pair,
              direction: form.direction,
              entry: form.entry !== "" && form.entry != null ? parseFloat(form.entry) : null,
              stop_loss: form.stop_loss !== "" && form.stop_loss != null ? parseFloat(form.stop_loss) : null,
              take_profit: form.take_profit !== "" && form.take_profit != null ? parseFloat(form.take_profit) : null,
              rr: form.rr !== "" && form.rr != null ? parseFloat(form.rr) : null,
              pnl: pnl !== null ? parseFloat(pnl) : null,
              session: form.session,
              date: form.date,
              notes: form.notes,
              screenshot_url: null,
              outcome: form.outcome || null,
            })
            .select()
            .single();
          if (insertError) throw insertError;

          if (screenshotFile && !screenshotUploaded) {
            sharedScreenshotUrl = await uploadScreenshot(screenshotFile, inserted.id, accId);
            screenshotUploaded = true;
          }

          if (sharedScreenshotUrl) {
            await supabase.from("trades").update({ screenshot_url: sharedScreenshotUrl }).eq("id", inserted.id);
          }

          // Fire notification checks after each successful insert
          await checkAndInsertNotifications(accId, user.id, form.date);
        }
      }

      if (activeAccount) await fetchTrades(activeAccount.id);
      return null;
    } catch (err) {
      return { error: "Failed to save trade. Please try again." };
    } finally {
      setSaving(false);
    }
  }

  // ── Notification trigger — runs after every successful trade save ──
  async function checkAndInsertNotifications(accId, userId, tradeDateStr) {
    try {
      // 1. Fetch account rules
      const { data: acc, error: accErr } = await supabase
        .from("accounts")
        .select("account_size, max_drawdown, daily_drawdown, profit_target, min_trading_days")
        .eq("id", accId)
        .single();
      if (accErr || !acc) return;

      const accountSize   = parseFloat(acc.account_size)   || 0;
      const maxDDLimit    = parseFloat(acc.max_drawdown)    || 0;
      const dailyDDLimit  = parseFloat(acc.daily_drawdown)  || 0;
      const profitTarget  = parseFloat(acc.profit_target)   || 0;
      const minDays       = acc.min_trading_days            || 0;

      // Nothing to check if no rules are set
      if (!maxDDLimit && !dailyDDLimit && !profitTarget) return;

      // 2. Fetch all trades for this account
      const { data: allTrades } = await supabase
        .from("trades")
        .select("pnl, date")
        .eq("account_id", accId);
      const trades = (allTrades || []).filter(t => t.pnl != null);

      // 3. Compute metrics
      // Daily loss (today only)
      const todayTrades = trades.filter(t => t.date === tradeDateStr);
      const dailyPnl    = todayTrades.reduce((s, t) => s + parseFloat(t.pnl), 0);
      const dailyLoss   = Math.max(0, -dailyPnl);

      // Max drawdown used (running balance low-water mark)
      let balance = accountSize;
      let lowestBalance = accountSize;
      for (const t of trades) {
        balance += parseFloat(t.pnl);
        if (balance < lowestBalance) lowestBalance = balance;
      }
      const maxDDUsed = Math.max(0, accountSize - lowestBalance);

      // Total net P&L
      const netPnl = trades.reduce((s, t) => s + parseFloat(t.pnl), 0);

      // Trading days
      const tradingDays = new Set(trades.map(t => t.date)).size;

      // 4. Determine which notifications to fire
      const toInsert = [];
      const today = tradeDateStr;

      if (dailyDDLimit > 0) {
        if (dailyLoss >= dailyDDLimit) {
          toInsert.push({
            type: "daily_dd_hit",
            message: `Daily drawdown limit reached on account. Daily loss: $${dailyLoss.toFixed(2)} / $${dailyDDLimit.toFixed(2)}.`,
          });
        } else if (dailyLoss >= dailyDDLimit * 0.8) {
          toInsert.push({
            type: "daily_dd_warning",
            message: `Daily drawdown 80% used. Loss today: $${dailyLoss.toFixed(2)} / $${dailyDDLimit.toFixed(2)}.`,
          });
        }
      }

      if (maxDDLimit > 0) {
        if (maxDDUsed >= maxDDLimit) {
          toInsert.push({
            type: "challenge_failed",
            message: `Challenge blown. Max drawdown exceeded: $${maxDDUsed.toFixed(2)} / $${maxDDLimit.toFixed(2)}.`,
          });
          toInsert.push({
            type: "max_dd_hit",
            message: `Max drawdown limit reached. Drawdown: $${maxDDUsed.toFixed(2)} / $${maxDDLimit.toFixed(2)}.`,
          });
        } else if (maxDDUsed >= maxDDLimit * 0.7) {
          toInsert.push({
            type: "max_dd_warning",
            message: `Max drawdown 70% used. Drawdown: $${maxDDUsed.toFixed(2)} / $${maxDDLimit.toFixed(2)}.`,
          });
        }
      }

      if (profitTarget > 0 && netPnl >= profitTarget) {
        const minDaysMet = minDays === 0 || tradingDays >= minDays;
        if (minDaysMet) {
          toInsert.push({
            type: "challenge_passed",
            message: `Challenge passed! Profit target hit: +$${netPnl.toFixed(2)} / $${profitTarget.toFixed(2)}.`,
          });
        }
        toInsert.push({
          type: "profit_target",
          message: `Profit target reached: +$${netPnl.toFixed(2)} / $${profitTarget.toFixed(2)}.`,
        });
      }

      if (toInsert.length === 0) return;

      // 5. Fetch existing notifications today to dedup
      const { data: existing } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`);

      const existingTypes = new Set((existing || []).map(n => n.type));

      // 6. Insert only new ones
      const newNotifications = toInsert
        .filter(n => !existingTypes.has(n.type))
        .map(n => ({
          user_id: userId,
          type: n.type,
          message: n.message,
          read: false,
        }));

      if (newNotifications.length > 0) {
        await supabase.from("notifications").insert(newNotifications);
      }
    } catch {
      // Notification errors must never break the trade save flow
    }
  }

  // ── Delete ──
  async function handleDelete(id) {
    if (!window.confirm("Delete this trade?")) return;
    try {
      const { error } = await supabase.from("trades").delete().eq("id", id);
      if (error) throw error;
      setTrades(ts => ts.filter(t => t.id !== id));
    } catch {
      setError("Failed to delete trade.");
    }
  }

  function openNew() { setEditTrade(null); setFormOpen(true); }
  function openEdit(t) { setEditTrade(t); setFormOpen(true); }

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    const filtered = trades.filter(t => {
      if (filterDir === 'all') return true;
      if (filterDir === 'win')  return t.outcome === 'win';
      if (filterDir === 'loss') return t.outcome === 'loss';
      return t.direction === filterDir; // 'long' | 'short'
    });

    const pillStyle = (active) => ({
      fontSize: '11px',
      padding: '4px 10px',
      borderRadius: '5px',
      border: `0.5px solid ${active ? '#555' : '#1e1e1e'}`,
      background: active ? '#1e1e1e' : '#111',
      color: active ? '#e0e0e0' : '#777',
      fontFamily: "'JetBrains Mono', monospace",
      whiteSpace: 'nowrap',
      flexShrink: 0,
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    });

    const colTemplate = '36px 1fr 46px 38px 52px 48px';
    const headerCellStyle = {
      fontSize: '9px', color: '#555', fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase', letterSpacing: '0.08em',
    };

    const mobileBadge = (label, bg, color, border) => (
      <span style={{
        fontSize: '8px', padding: '1px 4px', borderRadius: '3px',
        background: bg, color, border: `0.5px solid ${border}`,
        fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
        letterSpacing: '0.03em', whiteSpace: 'nowrap',
      }}>{label}</span>
    );

    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Sidebar renders the top bar (hamburger) + drawer + bottom tabs — same as Dashboard */}
        <Sidebar />

        {/* "Trade Log" title — overlaid in the top bar's left area (after hamburger) */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '52px',
          display: 'flex', alignItems: 'center',
          paddingLeft: '52px',
          zIndex: 201, pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: '15px',
            fontWeight: '500', color: '#e0e0e0',
          }}>Trade Log</span>
        </div>

        {/* ── ROW 2: Account dropdown pill (left) + Log Trade button (right) ── */}
        <MobileAccountRow
          accounts={accounts}
          activeAccount={activeAccount}
          onSwitch={(acc) => { setActiveAccount(acc); if (acc?.id) localStorage.setItem('activeAccountId', acc.id); }}
        />

        {/* ── ROW 3: Filter bar — All / Win / Loss / Long / Short ── */}
        <div style={{
          position: 'fixed', top: '100px', left: 0, right: 0,
          background: '#0a0a0a', borderBottom: '0.5px solid #111',
          padding: '6px 14px', zIndex: 198,
          display: 'flex', gap: '5px', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { key: 'all',   label: 'All' },
            { key: 'win',   label: 'Win' },
            { key: 'loss',  label: 'Loss' },
            { key: 'long',  label: 'Long' },
            { key: 'short', label: 'Short' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterDir(key)} style={pillStyle(filterDir === key)}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ROW 4: Column headers ── */}
        <div style={{
          position: 'fixed', top: '134px', left: 0, right: 0,
          background: '#0a0a0a', borderBottom: '0.5px solid #161616',
          padding: '8px 14px', zIndex: 197,
          display: 'grid', gridTemplateColumns: colTemplate, gap: '6px', alignItems: 'center',
        }}>
          <span style={headerCellStyle}>Date</span>
          <span style={headerCellStyle}>Pair</span>
          <span style={{ ...headerCellStyle, textAlign: 'center' }}>Result</span>
          <span style={{ ...headerCellStyle, textAlign: 'center' }}>Side</span>
          <span style={{ ...headerCellStyle, textAlign: 'right' }}>P&L</span>
          <span style={headerCellStyle} />
        </div>

        {/* Scrollable trade list */}
        <main style={{ paddingTop: '166px', paddingBottom: '68px', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ margin: '10px 14px', background: '#1e0d0d', border: '0.5px solid #2e1515', borderRadius: '8px', padding: '10px 14px', color: '#c03535', fontSize: '12px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#999', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
              Loading trades…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#999', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
              No trades yet.
            </div>
          ) : (
            filtered.map(t => {
              const pnlVal = t.pnl != null ? parseFloat(t.pnl) : null;
              const pnlClr = pnlVal > 0 ? '#1bba7c' : pnlVal < 0 ? '#c03535' : '#c97a00';
              const outcomeMap = {
                win: { label: 'WIN', bg: '#0f2219', color: '#1bba7c', border: '#1a3826' },
                loss: { label: 'LOSS', bg: '#1e0d0d', color: '#c03535', border: '#2e1515' },
                be: { label: 'BE', bg: '#1a1400', color: '#c97a00', border: '#2a2000' },
                in_progress: { label: 'IN PROG', bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' },
              };
              const ob = outcomeMap[t.outcome];
              const isLong = t.direction === 'long';

              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: colTemplate, gap: '6px', alignItems: 'center',
                  padding: '10px 14px', borderBottom: '0.5px solid #111',
                }} onClick={() => setDetailTrade(t)}>
                  {/* Date */}
                  <div style={{ fontSize: '10px', color: '#999', fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </div>

                  {/* Pair */}
                  <div style={{
                    fontSize: '12px', fontWeight: '500', color: '#ccc', fontFamily: "'JetBrains Mono', monospace",
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {t.pair}
                  </div>

                  {/* Result */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {ob ? mobileBadge(ob.label, ob.bg, ob.color, ob.border) : <span style={{ color: '#555', fontSize: '11px' }}>—</span>}
                  </div>

                  {/* Side */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {mobileBadge(isLong ? 'BUY' : 'SELL',
                      isLong ? '#0f2219' : '#1e0d0d',
                      isLong ? '#1bba7c' : '#c03535',
                      isLong ? '#1a3826' : '#2e1515'
                    )}
                  </div>

                  {/* P&L + RR */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: pnlClr, fontFamily: "'JetBrains Mono', monospace" }}>
                      {pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(0)}` : '—'}
                    </div>
                    <div style={{ fontSize: '9px', color: '#777', fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.rr ? `${t.rr}R` : ''}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditTrade(t); setFormOpen(true); }} style={{
                      width: '22px', height: '22px', background: '#1a1a1a',
                      border: '0.5px solid #222', borderRadius: '5px',
                      color: '#999', cursor: 'pointer', fontSize: '10px', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✏</button>
                    <button onClick={() => handleDelete(t.id)} style={{
                      width: '22px', height: '22px', background: '#1e0d0d',
                      border: '0.5px solid #2e1515', borderRadius: '5px',
                      color: '#c03535', cursor: 'pointer', fontSize: '10px', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* Trade Detail Modal (reused) */}
        {detailTrade && (
          <TradeDetailModal
            trade={detailTrade}
            onClose={() => setDetailTrade(null)}
            onEdit={(t) => { setDetailTrade(null); setEditTrade(t); setFormOpen(true); }}
            onDelete={handleDelete}
          />
        )}

        {/* Mobile Bottom Sheet Form */}
        {formOpen && (
          <MobileTradeForm
            key={editTrade ? editTrade.id : 'new'}
            onClose={() => setFormOpen(false)}
            onSave={handleSave}
            editTrade={editTrade}
            saving={saving}
            accounts={loggableAccounts}
          />
        )}
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  const filtered = trades
    .filter(t => filterDir === "all" || t.direction === filterDir)
    .filter(t => filterSession === "all" || t.session === filterSession);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div style={{ display: "flex", background: "#0a0a0a", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{
        marginLeft: collapsed ? "60px" : "220px", transition: "margin-left 0.2s ease", flex: 1, minHeight: "100vh",
        background: "#0a0a0a", color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif", padding: "32px",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; }
          input[type=number]::-webkit-outer-spin-button,
          input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
          select option { background: #111; }
          ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a0a; }
          ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
        `}</style>

        {/* Page Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", minWidth: 0, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: "22px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>Trade Log</h1>
              <div style={{ width: "1px", height: "28px", background: "#1a1a1a", flexShrink: 0 }} />

              {/* Account switcher */}
              <div ref={accountMenuRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setAccountMenuOpen(o => !o)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "7px 12px", borderRadius: "8px",
                    border: "0.5px solid #1e1e1e", background: "#111",
                    color: "#e0e0e0", fontFamily: "'Inter', sans-serif", fontSize: "13px",
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {activeAccount?.name || activeAccount?.firm_name || "Select Account"}
                  <ChevronDown size={14} style={{ color: "#777" }} />
                </button>
                {accountMenuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: "200px",
                    background: "#111", border: "0.5px solid #1e1e1e", borderRadius: "10px",
                    zIndex: 50, maxHeight: "260px", overflowY: "auto", padding: "4px",
                  }}>
                    {accounts.map(a => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setActiveAccount(a);
                          localStorage.setItem("activeAccountId", a.id);
                          setAccountMenuOpen(false);
                        }}
                        style={{
                          padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                          fontSize: "13px", fontFamily: "'Inter', sans-serif",
                          color: a.id === activeAccount?.id ? "#1bba7c" : "#ccc",
                          background: a.id === activeAccount?.id ? "#0f2219" : "transparent",
                        }}
                        onMouseEnter={e => { if (a.id !== activeAccount?.id) e.currentTarget.style.background = "#161616"; }}
                        onMouseLeave={e => { if (a.id !== activeAccount?.id) e.currentTarget.style.background = "transparent"; }}
                      >
                        {a.name || a.firm_name || "Account"}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeAccount && (
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "#666" }}>
                    Active Account
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "#e8e8e8", whiteSpace: "nowrap" }}>
                    {activeAccount.name || activeAccount.firm_name || "Account"}{" "}
                    {activeAccount.account_size && (
                      <span style={{ color: "#999" }}>${Number(activeAccount.account_size).toLocaleString()}</span>
                    )}{" "}
                    {activeAccount.created_at && (
                      <span style={{ color: "#555", fontSize: "12px" }}>
                        Since {new Date(activeAccount.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Import CSV + Log Trade buttons */}
            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
              <button onClick={() => setImportOpen(true)} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 16px", background: "transparent",
                border: "0.5px solid #1e1e1e", borderRadius: "8px", color: "#ccc",
                fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500,
                cursor: "pointer", whiteSpace: "nowrap",
              }}><ArrowUp size={15} /> Import CSV</button>
              <button onClick={openNew} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 18px", background: "#1bba7c", border: "none",
                borderRadius: "8px", color: "#000",
                fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#22d394"}
              onMouseLeave={e => e.currentTarget.style.background = "#1bba7c"}
              ><Plus size={15} /> Log Trade</button>
            </div>
          </div>
        </div>

        {/* Page-level error */}
        {error && (
          <div style={{
            background: "#1e0d0d", border: "0.5px solid #2e1515",
            borderRadius: "8px", padding: "12px 16px",
            color: "#c03535", fontSize: "13px", marginBottom: "16px",
          }}>{error}</div>
        )}

        {/* Filters + Export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", gap: "4px", padding: "4px", borderRadius: "10px", border: "0.5px solid #1a1a1a", background: "#121212" }}>
              {["all", "long", "short"].map(d => (
                <button key={d} onClick={() => { setFilterDir(d); setCurrentPage(1); }} style={{
                  padding: "7px 18px", borderRadius: "8px", border: "none",
                  background: filterDir === d ? "#0f2219" : "transparent",
                  color: filterDir === d ? "#1bba7c" : "#777",
                  fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600,
                  textTransform: "capitalize",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{d}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {SESSIONS.map(s => (
                <button key={s} onClick={() => { setFilterSession(filterSession === s ? "all" : s); setCurrentPage(1); }} style={{
                  padding: "7px 16px", borderRadius: "8px", border: "0.5px solid",
                  borderColor: filterSession === s ? "#1a3826" : "#1a1a1a",
                  background: filterSession === s ? "rgba(27,186,124,0.15)" : "#121212",
                  color: filterSession === s ? "#1bba7c" : "#999",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{sessionLabel(s)}</button>
              ))}
            </div>
          </div>
          <button onClick={() => {
            const headers = ["Date", "Pair", "Outcome", "Direction", "Entry", "Stop Loss", "Take Profit", "R:R", "Swap", "Commission", "P&L", "Session", "Notes"];
            const rows = filtered.map(t => [
              t.date, t.pair, t.outcome ?? "", t.direction,
              t.entry ?? "", t.stop_loss ?? "", t.take_profit ?? "",
              t.rr ?? "", t.swap ?? "", t.commission ?? "", t.pnl ?? "",
              t.session, (t.notes || "").replace(/,/g, " "),
            ]);
            const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `trades-${activeAccount?.name || "export"}-${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }} style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "7px 14px", background: "#121212",
            border: "0.5px solid #1a1a1a", borderRadius: "8px",
            color: "#777", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#777"; }}
          ><ArrowDown size={14} /> Export CSV</button>
        </div>

        {/* Table */}
        <div style={{ border: "0.5px solid #1a1a1a", borderRadius: "16px", overflow: "hidden", background: "#121212" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1a1a1a", background: "rgba(255,255,255,0.02)" }}>
                {["Date", "Pair", "Outcome", "Dir", "Entry", "R:R", "Swap", "Commission", "P&L", "Session", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "14px 16px",
                    textAlign: i === 0 || i === 1 ? "left" : i === 2 || i === 3 || i === 5 || i === 9 ? "center" : i === 10 ? "right" : "right",
                    fontSize: "11px", fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "#999", fontWeight: 700,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ padding: "48px", textAlign: "center", color: "#999", fontSize: "13px" }}>Loading trades…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: "48px", textAlign: "center", color: "#999", fontSize: "13px" }}>
                  No trades yet. Click <strong style={{ color: "#999" }}>+ Log Trade</strong> to get started.
                </td></tr>
              ) : (
                paginated.map(t => (
                  <TradeRow key={t.id} trade={t} onViewDetail={setDetailTrade} onEdit={openEdit} onDelete={handleDelete} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
            <p style={{ fontSize: "12px", color: "#555", fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
              {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} trade{filtered.length !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{
                  padding: "7px 16px", borderRadius: "8px", border: "0.5px solid #1a1a1a",
                  background: "#121212", color: safePage === 1 ? "#333" : "#ccc",
                  fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 500,
                  cursor: safePage === 1 ? "default" : "pointer",
                }}
              >← Prev</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{
                  padding: "7px 16px", borderRadius: "8px", border: "0.5px solid #1a1a1a",
                  background: "#121212", color: safePage === totalPages ? "#333" : "#ccc",
                  fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 500,
                  cursor: safePage === totalPages ? "default" : "pointer",
                }}
              >Next →</button>
            </div>
          </div>
        )}

        {/* Trade Detail Modal */}
        {detailTrade && (
          <TradeDetailModal
            trade={detailTrade}
            onClose={() => setDetailTrade(null)}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}

        {/* CSV Import Modal */}
        <CSVImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          activeAccount={activeAccount}
          onImported={() => { if (activeAccount) fetchTrades(activeAccount.id); }}
        />

        {/* Full-screen trade form */}
        <TradeForm
          key={editTrade ? editTrade.id : 'new'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          editTrade={editTrade}
          saving={saving}
          accounts={loggableAccounts}
        />
      </div>
    </div>
  );
}

// ─── Mobile Trade Form (Bottom Sheet) ─────────────────────────────────────────
function MobileTradeForm({ onClose, onSave, editTrade, saving, accounts }) {
  const initForm = editTrade ? {
    pair: editTrade.pair || "EURUSD",
    direction: editTrade.direction || "long",
    entry: editTrade.entry != null ? String(editTrade.entry) : "",
    stop_loss: editTrade.stop_loss != null ? String(editTrade.stop_loss) : "",
    take_profit: editTrade.take_profit != null ? String(editTrade.take_profit) : "",
    rr: editTrade.rr != null ? String(editTrade.rr) : "",
    session: editTrade.session || "london",
    date: editTrade.date || new Date().toISOString().split("T")[0],
    notes: editTrade.notes || "",
    screenshot_url: editTrade.screenshot_url || null,
    outcome: editTrade.outcome ?? null,
  } : makeEmptyForm();

  const initRisk = (() => {
    if (!editTrade) return {};
    const acc = accounts.find(a => a.id === editTrade.account_id);
    if (acc?.account_size && editTrade.pnl != null && editTrade.rr) {
      const rr = parseFloat(editTrade.rr);
      const pnl = Math.abs(parseFloat(editTrade.pnl));
      const size = parseFloat(acc.account_size);
      if (rr > 0 && size > 0) return { [editTrade.account_id]: ((pnl / rr / size) * 100).toFixed(2) };
    }
    return {};
  })();

  const initSelected = editTrade
    ? new Set([editTrade.account_id])
    : (() => { const p = accounts.find(a => a.type === "personal"); return p ? new Set([p.id]) : new Set(); })();

  const initModes = editTrade
    ? { [editTrade.account_id]: "$" }
    : (() => { const p = accounts.find(a => a.type === "personal"); return p ? { [p.id]: "$" } : {}; })();

  const [form, setForm] = useState(initForm);
  const [accountRisks, setAccountRisks] = useState(initRisk);
  const [accountRiskModes, setAccountRiskModes] = useState(initModes);
  const [selectedAccounts, setSelectedAccounts] = useState(initSelected);
  const [formError, setFormError] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  // 'manual' = quick-select R:R (default), 'auto' = Entry/SL/TP price mode
  const [rrMode, setRrMode] = useState(() => {
    if (editTrade && editTrade.entry && editTrade.stop_loss && editTrade.take_profit) return 'auto';
    return 'manual';
  });
  const fileRef = useRef();

  // On mount (new trade only), pre-fill entry/SL/TP from last trade for default pair
  useEffect(() => {
    if (editTrade) return;
    mobilePrefillPair(initForm.pair, setForm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function mobilePrefillPair(pair, updater) {
    if (!pair || !PAIRS.includes(pair.toUpperCase())) return;
    try {
      const { data } = await supabase
        .from("market_prices")
        .select("price")
        .eq("pair", pair)
        .maybeSingle();
      if (data && data.price && data.price !== 0) {
        const price = String(data.price);
        updater(prev => ({
          ...prev,
          entry: price,
          stop_loss: price,
          take_profit: price,
          rr: "",
        }));
      }
    } catch { /* no price found for this pair */ }
  }
  function set(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === "pair") {
        next.entry = "";
        next.stop_loss = "";
        next.take_profit = "";
        next.rr = "";
      } else if (rrMode === "auto") {
        next.rr = calcRR(
          k === "entry" ? v : next.entry,
          k === "stop_loss" ? v : next.stop_loss,
          k === "take_profit" ? v : next.take_profit,
        );
      }
      return next;
    });
    if (k === "pair" && PAIRS.includes(v.toUpperCase())) {
      mobilePrefillPair(v, setForm);
    }
  }

  function toggleAccount(acc) {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(acc.id)) {
        if (next.size === 1) return prev;
        next.delete(acc.id);
        setAccountRisks(r => { const n = { ...r }; delete n[acc.id]; return n; });
        setAccountRiskModes(m => { const n = { ...m }; delete n[acc.id]; return n; });
      } else {
        next.add(acc.id);
        setAccountRisks(r => ({ ...r, [acc.id]: "" }));
        setAccountRiskModes(m => ({ ...m, [acc.id]: "$" }));
      }
      return next;
    });
  }

  async function handleSave() {
    setFormError(null);
    if (selectedAccounts.size === 0) { setFormError("Select at least one account."); return; }
    const result = await onSave(form, screenshotFile, selectedAccounts, accountRisks, accountRiskModes);
    if (result && result.error) {
      setFormError(result.error);
    } else {
      localStorage.setItem("lastTradePair", form.pair);
      if (!editTrade) {
        setSelectedAccounts(new Set());
        setAccountRisks({});
        setAccountRiskModes({});
      }
      onClose();
    }
  }

  const mobileInput = {
    width: '100%', background: '#111', border: '0.5px solid #1e1e1e',
    borderRadius: '6px', padding: '8px 10px', color: '#ccc',
    fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  };

  const formLbl = { fontSize: '10px', color: '#777', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: "'JetBrains Mono', monospace", display: 'block' };

  return (
    <>
      {/* Full-screen portrait modal */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
        background: '#0a0a0a',
        zIndex: 500, display: 'flex', flexDirection: 'column',
        overflowY: 'hidden',
      }}>
        {/* Sticky top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#0d0d0d', borderBottom: '0.5px solid #1a1a1a',
          padding: '0 16px', height: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: '15px',
            fontWeight: '600', color: '#e0e0e0',
          }}>
            {editTrade ? 'Edit Trade' : 'Log Trade'}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          </div>
        </div>

        {/* Scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '0px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: '#1e1e1e #0a0a0a' }}>

          {/* Pair + Direction */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #111' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={formLbl}>Pair</span>
                <PairCombobox
                  value={form.pair}
                  onChange={val => set('pair', val)}
                  inputStyle={mobileInput}
                />
              </div>
              <div>
                <span style={formLbl}>Direction</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  {['long', 'short'].map(d => (
                    <button key={d} onClick={() => set('direction', d)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: '6px', cursor: 'pointer',
                      border: form.direction === d
                        ? `0.5px solid ${d === 'long' ? '#1a3826' : '#2e1515'}`
                        : '0.5px solid #1e1e1e',
                      background: form.direction === d ? (d === 'long' ? '#0f2219' : '#1e0d0d') : '#111',
                      color: form.direction === d ? (d === 'long' ? '#1bba7c' : '#c03535') : '#777',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase',
                    }}>{d === 'long' ? 'LONG' : 'SHORT'}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* R:R Section — mode toggle */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #111' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={formLbl}>{rrMode === 'manual' ? 'Risk:Reward' : 'Entry / SL / TP'}</span>
              <div style={{ display: 'flex', border: '0.5px solid #1e1e1e', borderRadius: '5px', overflow: 'hidden' }}>
                {[['manual', 'R:R'], ['auto', 'Price']].map(([mode, label]) => (
                  <button key={mode} onClick={() => setRrMode(mode)} style={{
                    padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: '10px',
                    fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                    background: rrMode === mode ? '#1bba7c22' : '#111',
                    color: rrMode === mode ? '#1bba7c' : '#555',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {rrMode === 'manual' ? (
              /* Quick-select buttons */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['1', '2', '3', '4', '5'].map(n => {
                    const active = form.rr === n;
                    return (
                      <button key={n} onClick={() => setForm(prev => ({ ...prev, rr: active ? '' : n }))} style={{
                        flex: 1, padding: '9px 2px', borderRadius: '6px', cursor: 'pointer',
                        border: `0.5px solid ${active ? '#1a3826' : '#1e1e1e'}`,
                        background: active ? '#0f2219' : '#111',
                        color: active ? '#1bba7c' : '#666',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
                      }}>1:{n}</button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#555', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', flexShrink: 0 }}>1:</span>
                  <input type="number" step="0.1" min="0.1" placeholder="Custom (e.g. 2.5)"
                    value={form.rr} onChange={e => setForm(prev => ({ ...prev, rr: e.target.value }))}
                    style={mobileInput} />
                </div>
              </div>
            ) : (
              /* Auto price mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[['Entry', 'entry'], ['Stop Loss', 'stop_loss'], ['Take Profit', 'take_profit']].map(([label, key]) => (
                    <div key={key}>
                      <span style={formLbl}>{label}</span>
                      <input type="number" step="0.00001" placeholder="0.00000"
                        value={form[key]} onChange={e => set(key, e.target.value)}
                        style={mobileInput} />
                    </div>
                  ))}
                </div>
                <div style={{
                  background: '#111', border: `0.5px solid ${form.rr ? '#1a3826' : '#1e1e1e'}`,
                  borderRadius: '6px', height: '36px', display: 'flex', alignItems: 'center', padding: '0 10px',
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#777', marginRight: '6px' }}>R:R</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: form.rr ? '#1bba7c' : '#555' }}>
                    {form.rr ? `1:${form.rr}` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Session */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #111' }}>
            <span style={formLbl}>Session</span>
            <select value={form.session} onChange={e => set('session', e.target.value)} style={{ ...mobileInput, appearance: 'none', cursor: 'pointer' }}>
              {SESSIONS.map(s => <option key={s} value={s}>{sessionLabel(s)}</option>)}
            </select>
          </div>

          {/* Date + Outcome */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #111' }}>
            <span style={formLbl}>Date</span>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              style={{ ...mobileInput, marginBottom: '10px' }} />
            <span style={formLbl}>Outcome</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[
                { value: 'win', label: 'WIN', bg: '#0f2219', color: '#1bba7c', border: '#1a3826' },
                { value: 'loss', label: 'LOSS', bg: '#1e0d0d', color: '#c03535', border: '#2e1515' },
                { value: 'be', label: 'BE', bg: '#1a1400', color: '#c97a00', border: '#2a2000' },
                { value: 'in_progress', label: 'IN PROG', bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' },
              ].map(({ value, label, bg, color, border }) => {
                const active = form.outcome === value;
                return (
                  <button key={value} onClick={() => set('outcome', active ? null : value)} style={{
                    flex: 1, padding: '7px 2px', borderRadius: '6px', cursor: 'pointer',
                    border: `0.5px solid ${active ? border : '#1e1e1e'}`,
                    background: active ? bg : '#111',
                    color: active ? color : '#777',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', textTransform: 'uppercase',
                  }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* Accounts */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #111' }}>
            <span style={{ ...formLbl, marginBottom: '8px' }}>Accounts — select &amp; set risk</span>
            {accounts.map(acc => {
              const isSelected = selectedAccounts.has(acc.id);
              const mode = accountRiskModes[acc.id] || '$';
              const rawVal = accountRisks[acc.id] || '';
              const num = parseFloat(rawVal);
              let resolvedPct = null, resolvedDollar = null;
              if (!isNaN(num) && num > 0 && acc.account_size) {
                if (mode === '%') { resolvedPct = num; resolvedDollar = ((num / 100) * acc.account_size).toFixed(2); }
                else { resolvedDollar = num.toFixed(2); resolvedPct = ((num / acc.account_size) * 100).toFixed(2); }
              }
              const pnlVal = resolvedPct ? calcPnl(resolvedPct, acc.account_size, form.rr, form.outcome) : null;
              const pnlNum = pnlVal !== null ? parseFloat(pnlVal) : null;
              const isChallenge = acc.type !== 'personal';

              return (
                <div key={acc.id} onClick={() => toggleAccount(acc)} style={{
                  background: '#111', border: `0.5px solid ${isSelected ? '#1a3826' : '#1e1e1e'}`,
                  borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', cursor: 'pointer',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isSelected ? '10px' : 0 }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                      border: `0.5px solid ${isSelected ? '#1bba7c' : '#555'}`,
                      background: isSelected ? '#0f2219' : '#1a1a1a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <span style={{ color: '#1bba7c', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: '12px', fontWeight: '500', color: isSelected ? '#ccc' : '#777', fontFamily: "'Inter', sans-serif" }}>{acc.name}</span>
                    <span style={{
                      fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
                      background: isChallenge ? '#0f1a2e' : '#1a1a1a',
                      color: isChallenge ? '#4d9fff' : '#777',
                      border: `0.5px solid ${isChallenge ? '#1a3050' : '#222'}`,
                      fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                    }}>{isChallenge ? 'CHALLENGE' : 'PERSONAL'}</span>
                    {acc.account_size && <span style={{ fontSize: '10px', color: '#777', fontFamily: "'JetBrains Mono', monospace" }}>${(parseFloat(acc.account_size) / 1000).toFixed(0)}k</span>}
                  </div>

                  {/* Risk inputs — only when selected */}
                  {isSelected && (
                    <div onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        {/* % / $ toggle */}
                        <div style={{ display: 'flex', border: '0.5px solid #222', borderRadius: '4px', overflow: 'hidden' }}>
                          {['$', '%'].map(m => (
                            <button key={m} onClick={() => {
                              const cur = mode;
                              if (cur === m) return;
                              const val = parseFloat(rawVal);
                              let converted = '';
                              if (!isNaN(val) && val > 0 && acc.account_size) {
                                converted = m === '$' ? ((val / 100) * acc.account_size).toFixed(2) : ((val / acc.account_size) * 100).toFixed(2);
                              }
                              setAccountRiskModes(prev => ({ ...prev, [acc.id]: m }));
                              if (converted) setAccountRisks(prev => ({ ...prev, [acc.id]: converted }));
                            }} style={{
                              fontSize: '10px', padding: '3px 8px', cursor: 'pointer', border: 'none',
                              background: mode === m ? '#1bba7c22' : '#1a1a1a',
                              color: mode === m ? '#1bba7c' : '#777',
                            }}>{m}</button>
                          ))}
                        </div>
                        <input type="number" step="0.01" placeholder="1.0"
                          value={rawVal}
                          onChange={e => setAccountRisks(prev => ({ ...prev, [acc.id]: e.target.value }))}
                          style={{ flex: 1, background: '#0f0f0f', border: '0.5px solid #1e1e1e', borderRadius: '4px', padding: '4px 8px', color: '#ccc', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', outline: 'none' }}
                        />
                        <span style={{ fontSize: '10px', color: '#777', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                          {mode === '%' && rawVal ? `${rawVal}%` : mode === '$' && rawVal ? `$${rawVal}` : ''}
                        </span>
                      </div>
                      {/* Risk stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        {[
                          { label: 'Risk %', value: resolvedPct ? `${parseFloat(resolvedPct).toFixed(2)}%` : '—' },
                          { label: 'Risk $', value: resolvedDollar ? `$${resolvedDollar}` : '—' },
                          { label: 'Est. P&L', value: pnlNum !== null ? `${pnlNum >= 0 ? '+' : ''}$${Math.abs(pnlNum).toFixed(2)}` : '—', color: pnlNum !== null ? pnlColor(pnlNum) : '#999' },
                        ].map(s => (
                          <div key={s.label}>
                            <div style={{ fontSize: '9px', color: '#999', fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
                            <div style={{ fontSize: '11px', fontWeight: '500', color: s.color || '#aaa', fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #111' }}>
            <span style={formLbl}>Notes</span>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Trade rationale, confluences…" rows={3}
              style={{ ...mobileInput, resize: 'vertical', minHeight: '70px', fontFamily: "'Inter', sans-serif", lineHeight: '1.5' }} />
          </div>

          {/* Screenshot */}
          <div style={{ padding: '10px 16px' }}>
            <span style={formLbl}>Chart Screenshot</span>
            <div onClick={() => fileRef.current.click()} style={{
              background: '#111', border: '0.5px dashed #1e1e1e', borderRadius: '6px',
              padding: '16px', textAlign: 'center', cursor: 'pointer',
            }}>
              {screenshotFile
                ? <span style={{ color: '#1bba7c', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>📎 {screenshotFile.name}</span>
                : form.screenshot_url
                  ? <span style={{ color: '#4d9fff', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>📎 Screenshot attached</span>
                  : <span style={{ color: '#999', fontFamily: "'Inter', sans-serif", fontSize: '12px' }}>Tap to upload</span>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setScreenshotFile(e.target.files[0]); }} />
          </div>
        </div>

        {/* Sticky Save button */}
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          padding: '10px 16px 14px',
          background: '#0d0d0d',
          borderTop: '0.5px solid #1a1a1a', flexShrink: 0,
        }}>
          {formError && <div style={{ color: '#c03535', fontSize: '11px', marginBottom: '6px', fontFamily: "'Inter', sans-serif" }}>{formError}</div>}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', height: '44px', background: saving ? '#555' : 'oklch(0.72 0.17 152)',
            border: 'none', borderRadius: '8px', color: saving ? '#777' : '#000',
            fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'oklch(0.78 0.17 152)' }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = 'oklch(0.72 0.17 152)' }}
          >
            {saving ? 'Saving…' : 'Save Trade'}
          </button>
        </div>
      </div>
    </>
  );
}