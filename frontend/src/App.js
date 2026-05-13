import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

const WS_URL =
  process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws";

 
const SEV_COLOR = { HIGH: "#dc2626", MEDIUM: "#f97316", LOW: "#22c55e" };

const I = ({ d, size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const IC = {
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  dashboard: ["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"],
  alert:     ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"],
  logs:      ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"],
  agents:    ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 11a4 4 0 100-8 4 4 0 000 8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"],
  laptop:    ["M20 16V7a2 2 0 00-2-2H6a2 2 0 00-2 2v9","M1 16h22","M8 20h8"],
  bug:       ["M9 9V6a3 3 0 016 0v3","M3 13a9 9 0 1018 0","M12 13v4"],
  chat:      "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  settings:  ["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  bell:      ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"],
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  server:    ["M2 3h20v6H2z","M2 15h20v6H2z","M6 9v6","M12 9v6","M18 9v6"],
  up:        "M12 19V5M5 12l7-7 7 7",
  down:      "M12 5v14M5 12l7 7 7-7",
  check:     "M20 6L9 17l-5-5",
  block:     "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  bolt:      "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  key:       "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  radar:     ["M12 2a10 10 0 100 20A10 10 0 0012 2z","M12 6a6 6 0 100 12A6 6 0 0012 6z","M12 10a2 2 0 100 4 2 2 0 000-4z"],
  code:      "M16 18l6-6-6-6M8 6l-6 6 6 6",
  send:      "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  close:     "M18 6L6 18M6 6l12 12",
  eye:       ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0"],
  wifi:      ["M5 12.55a11 11 0 0114.08 0","M1.42 9a16 16 0 0121.16 0","M8.53 16.11a6 6 0 016.95 0","M12 20h.01"],
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [elkLogs, setElkLogs] = useState([]);
  const [elkQuery, setElkQuery] = useState("*");
  const [elkStatus, setElkStatus] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [simLoading, setSimLoading] = useState(null);
  const [newAlert, setNewAlert] = useState(null);
  const [agentOk, setAgentOk] = useState(false);

  const chatEndRef = useRef(null);
  const ws = useRef(null);

  // ================= WS =================
  useEffect(() => {
    let isMounted = true;

    const connectWS = () => {
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);

          if (!isMounted) return;

          if (data.type === "new_incident") {
            setIncidents((p) => {
              if (p.some(x => x.id === data.incident.id)) return p;
              return [data.incident, ...p];
            });
            setNewAlert(data.incident);
            setTimeout(() => setNewAlert(null), 5000);
          }

          if (data.type === "new_event") {
            setEvents((p) => [data.data, ...p.slice(0, 99)]);
            setAgentOk(true);
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      socket.onerror = () => setAgentOk(false);
      socket.onclose = () => {
        if (isMounted) setTimeout(connectWS, 3000); // auto-reconnect
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      ws.current?.close();
    };
  }, []);

  // ================= LOAD =================
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [i, s, e, elk] = await Promise.all([
          axios.get(`${API}/api/incidents`),
          axios.get(`${API}/api/stats`),
          axios.get(`${API}/api/events`),
          axios.get(`${API}/api/elk/status`),
        ]);

        if (!alive) return;

        setIncidents(i.data);
        setStats(s.data);
        setEvents(e.data);
        setElkStatus(elk.data);
        if (e.data.length > 0) setAgentOk(true);
      } catch (err) {
        console.error(err);
      }
    };

    load();
    const t = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // ================= SCROLL CHAT =================
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ================= SIMULATOR =================
  const simulate = async (type) => {
    setSimLoading(type);
    try {
      await axios.post(`${API}/api/simulate/${type}`);
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setSimLoading(null), 3000);
  };

  // ================= BLOCK IP =================
  const blockIP = async (ip) => {
    try {
      await axios.post(`${API}/api/block-ip/${ip}`);
      setIncidents((p) =>
        p.map((i) =>
          i.source_ip === ip ? { ...i, blocked: true, status: "RESOLVED" } : i
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  // ================= CHAT =================
  const sendChat = async () => {
    if (!chatInput.trim()) return;

    const q = chatInput;
    setChatInput("");

    setChat((p) => [...p, { role: "user", text: q }]);

    try {
      const r = await axios.post(`${API}/api/chat`, { text: q });

      setChat((p) => [...p, { role: "ai", text: r.data.response }]);
    } catch {
      setChat((p) => [
        ...p,
        { role: "ai", text: "Connection error. Backend not reachable." },
      ]);
    }
  };

  // ================= ELK =================
  const searchElk = async () => {
    try {
      const r = await axios.get(
        `${API}/api/elk/search?q=${encodeURIComponent(elkQuery)}&size=20`
      );
      setElkLogs(r.data);
    } catch (e) {
      console.error(e);
    }
  };

  const openCount = incidents.filter((i) => !i.blocked).length;
  const riskScore = Math.min((stats.critiques || 0) * 12 + 20, 100);
  const nav = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "laptop",    icon: "laptop",    label: "My Laptop", badge: events.length, green: true },
    { id: "incidents", icon: "alert",     label: "Incidents", badge: openCount },
    { id: "elk",       icon: "logs",      label: "ELK Logs" },
    { id: "simulator", icon: "bug",       label: "Simulator" },
    { id: "chat",      icon: "chat",      label: "AI Assistant" },
    { id: "settings",  icon: "settings",  label: "Settings" },
  ];

  return (
    <div style={S.root}>

      {newAlert && (
        <div style={S.popup}>
          <I d={IC.alert} size={14} color="#dc2626" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>New incident detected</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{newAlert.type} from {newAlert.source_ip}</div>
          </div>
          <button onClick={() => setNewAlert(null)} style={S.popClose}><I d={IC.close} size={12} color="#9ca3af" /></button>
        </div>
      )}

      <header style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logoBox}><I d={IC.shield} size={15} color="#fff" /></div>
          <span style={S.logoText}>XIBAAR</span>
          <span style={S.logoSub}>AI Security Platform</span>
        </div>
        <div style={S.topMid}>
          <I d={IC.search} size={13} color="#9ca3af" />
          <input placeholder="Search incidents, IPs, events..." style={S.topSearch} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...S.pill, background: agentOk ? "#f0fdf4" : "#fef2f2", color: agentOk ? "#16a34a" : "#dc2626", border: `1px solid ${agentOk ? "#bbf7d0" : "#fecaca"}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: agentOk ? "#22c55e" : "#dc2626" }} />
            {agentOk ? "Agent active" : "Agent offline"}
          </div>
          <div style={S.iconBtn}><I d={IC.bell} size={15} color="#6b7280" /></div>
          <div style={S.avatar}>AD</div>
        </div>
      </header>

      <div style={S.body}>
        <aside style={S.sidebar}>
          <div style={{ padding: "14px 16px 10px" }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Welcome back</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Admin</div>
          </div>
          <div style={S.navGroup}>MAIN</div>
          {nav.slice(0, 4).map(n => <NavBtn key={n.id} n={n} active={page === n.id} onClick={() => setPage(n.id)} />)}
          <div style={S.navGroup}>TOOLS</div>
          {nav.slice(4, 6).map(n => <NavBtn key={n.id} n={n} active={page === n.id} onClick={() => setPage(n.id)} />)}
          <div style={S.navGroup}>CONFIG</div>
          {nav.slice(6).map(n => <NavBtn key={n.id} n={n} active={page === n.id} onClick={() => setPage(n.id)} />)}
        </aside>

        <main style={S.main}>

          {/* DASHBOARD */}
          {page === "dashboard" && (
            <div style={S.page}>
              <PH title="Dashboard" sub="Real-time security overview" />
              <div style={S.g4}>
                <Stat label="Total incidents" value={stats.total_incidents || 0} up />
                <Stat label="Open / Critical"  value={openCount}                trend="Needs action" down={openCount > 0} />
                <Stat label="IPs blocked"      value={stats.ips_bloquees || 0}  trend="Auto-blocked" up />
                <Stat label="Events logged"    value={stats.total_events || 0}  trend="ELK stream" />
              </div>
              <div style={S.g2}>
                <div style={S.card}>
                  <CT title="Active incidents" icon="alert" />
                  {incidents.length === 0
                    ? <Empty msg="No incidents. Run agent or use Simulator." />
                    : incidents.slice(0, 7).map(i => <IncRow key={i.id} inc={i} onBlock={blockIP} />)
                  }
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={S.card}>
                    <CT title="Attack trend" icon="radar" />
                    <Bars />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                      <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Risk score</span>
                      <div style={{ flex: 1, height: 5, background: "#f3f4f6", borderRadius: 99 }}>
                        <div style={{ width: `${riskScore}%`, height: "100%", background: riskScore > 70 ? "#dc2626" : "#f97316", borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{riskScore}</span>
                    </div>
                  </div>
                  <div style={S.card}>
                    <CT title="Machines" icon="server" />
                    {[
                      { name: "Your laptop",   os: "Windows", ip: "127.0.0.1",    on: agentOk },
                      { name: "server-pme-01", os: "Ubuntu",  ip: "192.168.1.10", on: false },
                    ].map(a => <AgentRow key={a.name} a={a} />)}
                  </div>
                </div>
              </div>
              <div style={S.card}>
                <CT title="ELK live stream" icon="logs" right={<ElkDot s={elkStatus} />} />
                {events.length === 0
                  ? <Empty msg="Waiting — start the agent on your laptop." />
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 1 }}>
                      {events.slice(0, 12).map((e, i) => <ERow key={i} e={e} />)}
                    </div>
                }
              </div>
            </div>
          )}

          {/* MY LAPTOP */}
          {page === "laptop" && (
            <div style={S.page}>
              <PH title="My Laptop" sub="Real-time Windows monitoring" />
              <div style={{ ...S.card, borderLeft: `4px solid ${agentOk ? "#22c55e" : "#dc2626"}` }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: agentOk ? "#f0fdf4" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <I d={IC.laptop} size={20} color={agentOk ? "#16a34a" : "#dc2626"} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                      Agent: {agentOk ? "Active — receiving real data from your laptop" : "Offline — not connected"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                      {agentOk
                        ? `Monitoring your Windows Event Logs in real time. ${events.length} events received.`
                        : "Start the agent to monitor your laptop."}
                    </div>
                  </div>
                </div>
                {!agentOk && (
                  <div style={{ marginTop: 14, background: "#f9fafb", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Start agent (PowerShell as Administrator):</div>
                    {["cd xibaar-ai\\agent", "pip install requests pywin32", "python agent_windows.py"].map((cmd, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>{i + 1}</span>
                        <code style={{ background: "#f3f4f6", padding: "3px 10px", borderRadius: 6, fontSize: 12, color: "#374151" }}>{cmd}</code>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                      Test: run <code style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 6 }}>net use \\localhost\IPC$ /user:hacker wrongpassword</code> in another PowerShell to trigger a real alert.
                    </div>
                  </div>
                )}
              </div>

              <div style={S.card}>
                <CT title="What XIBAAR detects on your laptop" icon="eye" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 10 }}>
                  {[
                    { id: "4625", label: "Failed login attempt",       sev: "HIGH",   desc: "Wrong password entered on your PC" },
                    { id: "4648", label: "Explicit credential login",  sev: "MEDIUM", desc: "Login with explicit credentials (suspicious)" },
                    { id: "4720", label: "New user account created",   sev: "HIGH",   desc: "A new Windows account was created" },
                    { id: "4726", label: "User account deleted",       sev: "HIGH",   desc: "A user account was removed" },
                    { id: "4732", label: "Admin group modified",       sev: "HIGH",   desc: "Someone added to an admin group" },
                    { id: "7045", label: "New service installed",      sev: "HIGH",   desc: "New Windows service (possible malware)" },
                    { id: "4624", label: "Off-hours login",            sev: "MEDIUM", desc: "Login before 6am or after 10pm" },
                  ].map(d => (
                    <div key={d.id} style={{ background: "#f9fafb", borderRadius: 12, padding: 12, border: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, background: SEV_COLOR[d.sev], color: "#fff", padding: "2px 8px", borderRadius: 99 }}>{d.sev}</span>
                        <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>ID {d.id}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{d.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={S.card}>
                <CT title={`Real events from your laptop (${events.length})`} icon="wifi" />
                {events.length === 0
                  ? <Empty msg="No events yet. Start the agent as Administrator." />
                  : events.slice(0, 25).map((e, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f9fafb", fontSize: 12 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: SEV_COLOR[e.severity] || "#9ca3af", flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: "#374151", flex: 1 }}>{e.type}</span>
                        <span style={{ color: "#f97316", fontFamily: "monospace" }}>{e.source_ip}</span>
                        <span style={{ color: "#9ca3af" }}>{e.timestamp?.substring(11, 19)}</span>
                        <span style={{ color: "#d1d5db", fontSize: 11, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.raw_log}</span>
                      </div>
                    ))
                }
              </div>
            </div>
          )}

          {/* INCIDENTS */}
          {page === "incidents" && (
            <div style={S.page}>
              <PH title="All incidents" sub={`${incidents.length} total — ${openCount} open`} />
              <div style={S.card}>
                {incidents.length === 0
                  ? <Empty msg="No incidents. Start agent or use Simulator." />
                  : incidents.map(i => <IncFull key={i.id} inc={i} onBlock={blockIP} />)
                }
              </div>
            </div>
          )}

          {/* ELK */}
          {page === "elk" && (
            <div style={S.page}>
              <PH title="ELK — Elasticsearch" sub="Search all raw logs" />
              <div style={S.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <ElkDot s={elkStatus} />
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {elkStatus?.status === "connected"
                      ? `v${elkStatus.version} · Kibana on http://localhost:5601`
                      : "Disconnected — run docker-compose up"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input value={elkQuery} onChange={e => setElkQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchElk()}
                    placeholder="severity:HIGH · type:brute_force_attempt · source_ip:185.*"
                    style={{ ...S.input, flex: 1 }} />
                  <button onClick={searchElk} style={S.btnDark}>Search</button>
                </div>
                {elkLogs.length > 0
                  ? <div>
                      <div style={{ display: "grid", gridTemplateColumns: "150px 170px 130px 80px 1fr", gap: 8, padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {["Timestamp","Type","IP","Severity","Log"].map(h => <span key={h}>{h}</span>)}
                      </div>
                      {elkLogs.map((l, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 170px 130px 80px 1fr", gap: 8, padding: "7px 0", borderBottom: "1px solid #f9fafb", fontSize: 12 }}>
                          <span style={{ color: "#9ca3af" }}>{l.timestamp?.substring(0, 19)}</span>
                          <span style={{ color: "#3b82f6" }}>{l.type}</span>
                          <span style={{ color: "#f97316", fontFamily: "monospace" }}>{l.source_ip}</span>
                          <span style={{ color: SEV_COLOR[l.severity] || "#9ca3af" }}>{l.severity}</span>
                          <span style={{ color: "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.raw_log?.substring(0, 70)}</span>
                        </div>
                      ))}
                    </div>
                  : <Empty msg="Enter a query and click Search." />
                }
              </div>
            </div>
          )}

          {/* SIMULATOR */}
          {page === "simulator" && (
            <div style={S.page}>
              <PH title="Attack simulator" sub="Test XIBAAR detection in real time" />
              <div style={S.g3b}>
                {[
                  { type: "brute_force", icon: "key",   label: "Brute Force SSH",  desc: "10 failed SSH login attempts from a fake external IP.", mitre: "T1110.001" },
                  { type: "port_scan",   icon: "radar", label: "Port scan (Nmap)",  desc: "500 ports scanned in 8 seconds.", mitre: "T1046" },
                  { type: "web_attack",  icon: "code",  label: "SQL Injection",     desc: "SQL injection on a web login form.", mitre: "T1190" },
                ].map(a => (
                  <div key={a.type} style={S.card}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                      <I d={IC[a.icon]} size={17} color="#374151" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 5 }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 6 }}>{a.desc}</div>
                    <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 14, fontFamily: "monospace" }}>MITRE {a.mitre}</div>
                    <button onClick={() => simulate(a.type)} disabled={!!simLoading}
                      style={{ ...S.btnDark, width: "100%", justifyContent: "center", opacity: simLoading ? 0.5 : 1 }}>
                      <I d={IC.bolt} size={12} color="#fff" />
                      {simLoading === a.type ? "Running..." : "Launch"}
                    </button>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <CT title="Demo scenario for jury" icon="check" />
                {[
                  "Open Dashboard — calm network, 0 incidents",
                  "Simulator → Brute Force SSH → red alert in under 5s",
                  "Click Details → Groq AI explains in French + MITRE ATT&CK",
                  "Click Block IP → incident resolved",
                  "ELK Logs → show raw logs in Elasticsearch",
                  "AI Assistant → ask 'avons-nous subi une attaque ?'",
                  "My Laptop → show real Windows events from your machine",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 6 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#111827", color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: "#374151" }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT */}
          {page === "chat" && (
            <div style={S.page}>
              <PH title="AI Assistant" sub="Powered by Groq — French or English" />
              <div style={{ ...S.card, maxWidth: 700 }}>
                <div style={{ minHeight: 380, marginBottom: 12 }}>
                  {chat.length === 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>Try asking:</div>
                      {[
                        "Avons-nous subi une attaque aujourd'hui ?",
                        "Quel est le niveau de risque actuel ?",
                        "Que recommandes-tu pour sécuriser mon laptop ?",
                        "How many incidents were detected?",
                      ].map(q => (
                        <div key={q} onClick={() => setChatInput(q)}
                          style={{ fontSize: 13, color: "#3b82f6", cursor: "pointer", padding: "7px 0", borderBottom: "1px solid #f9fafb" }}>
                          "{q}"
                        </div>
                      ))}
                    </div>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                      <div style={{ padding: "10px 14px", borderRadius: 14, maxWidth: "82%", fontSize: 13, lineHeight: 1.6, background: m.role === "user" ? "#111827" : "#f3f4f6", color: m.role === "user" ? "#fff" : "#111827", borderBottomRightRadius: m.role === "user" ? 4 : 14, borderBottomLeftRadius: m.role === "ai" ? 4 : 14 }}>
                        {m.role === "ai" && <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>XIBAAR AI</div>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: "flex", gap: 8, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder="Ask about your network security..."
                    style={{ ...S.input, flex: 1 }} />
                  <button onClick={sendChat} style={S.btnDark}>
                    <I d={IC.send} size={13} color="#fff" /> Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {page === "settings" && (
            <div style={S.page}>
              <PH title="Settings" sub="Platform configuration" />
              <div style={S.card}>
                <CT title="Status" icon="settings" />
                {[
                  ["Backend",        "http://localhost:8000"],
                  ["Elasticsearch",  elkStatus?.status === "connected" ? `Connected v${elkStatus.version}` : "Disconnected"],
                  ["Kibana",         "http://localhost:5601"],
                  ["AI Model",       "Groq llama3-70b (free)"],
                  ["Agent",          agentOk ? "Active" : "Offline"],
                  ["Events received",String(events.length)],
                  ["Total incidents",String(incidents.length)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9fafb", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>{k}</span>
                    <span style={{ color: "#111827", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function NavBtn({ n, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...S.navBtn, ...(active ? S.navOn : {}) }}>
      <I d={IC[n.icon]} size={14} color={active ? "#fff" : "#6b7280"} />
      <span style={{ flex: 1 }}>{n.label}</span>
      {n.badge > 0 && <span style={{ background: n.green ? "#22c55e" : "#dc2626", color: "#fff", fontSize: 10, borderRadius: 99, padding: "1px 6px" }}>{n.badge}</span>}
    </button>
  );
}

function PH({ title, sub }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{sub}</p>
    </div>
  );
}

function CT({ title, icon, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I d={IC[icon]} size={14} color="#374151" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

function Stat({ label, value, trend, up, down }) {
  return (
    <div style={S.card}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{value}</div>
      {trend && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 8, fontSize: 11, borderRadius: 99, padding: "2px 8px", background: up ? "#f0fdf4" : down ? "#fef2f2" : "#f9fafb", color: up ? "#16a34a" : down ? "#dc2626" : "#6b7280" }}>
          {up && <I d={IC.up} size={9} color="#16a34a" />}
          {down && <I d={IC.down} size={9} color="#dc2626" />}
          {trend}
        </div>
      )}
    </div>
  );
}

function IncRow({ inc, onBlock }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: inc.blocked ? "#22c55e" : SEV_COLOR[inc.severity] || "#9ca3af", flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: "#374151", flex: 1 }}>{inc.type}</span>
      <span style={{ fontSize: 11, color: "#f97316", fontFamily: "monospace" }}>{inc.source_ip}</span>
      <span style={{ fontSize: 10, borderRadius: 99, padding: "2px 8px", background: inc.blocked ? "#f0fdf4" : "#fef2f2", color: inc.blocked ? "#16a34a" : "#dc2626" }}>
        {inc.blocked ? "Resolved" : "Open"}
      </span>
      {!inc.blocked && (
        <button onClick={() => onBlock(inc.source_ip)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <I d={IC.block} size={13} color="#dc2626" />
        </button>
      )}
    </div>
  );
}

function IncFull({ inc, onBlock }) {
  const [open, setOpen] = useState(false);
  const a = inc.ai_analysis || {};
  return (
    <div style={{ borderBottom: "1px solid #f9fafb", padding: "13px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: inc.blocked ? "#22c55e" : SEV_COLOR[inc.severity] || "#9ca3af" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>#{inc.id} — {inc.type}</span>
        <span style={{ fontSize: 12, color: "#f97316", fontFamily: "monospace" }}>{inc.source_ip}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{inc.timestamp?.substring(0, 19).replace("T", " ")}</span>
        <button onClick={() => setOpen(!open)} style={S.btnSm}>{open ? "Hide" : "AI Details"}</button>
        {!inc.blocked
          ? <button onClick={() => onBlock(inc.source_ip)} style={{ ...S.btnSm, background: "#111827", color: "#fff", border: "none" }}>Block IP</button>
          : <span style={{ fontSize: 11, color: "#16a34a" }}>Blocked</span>
        }
      </div>
      {open && a.explication && (
        <div style={{ marginTop: 12, padding: 14, background: "#f9fafb", borderRadius: 12, fontSize: 12 }}>
          <div style={{ color: "#9ca3af", marginBottom: 6 }}>Groq AI Analysis:</div>
          <p style={{ color: "#374151", marginBottom: 8, lineHeight: 1.6 }}>{a.explication}</p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ color: "#9ca3af" }}>MITRE: <span style={{ color: "#7c3aed" }}>{a.mitre_id} — {a.mitre_nom}</span></span>
            <span style={{ color: "#9ca3af" }}>Risk: <span style={{ color: "#dc2626", fontWeight: 600 }}>{a.niveau_risque}</span></span>
          </div>
          <div style={{ color: "#9ca3af", marginBottom: 6 }}>Next step: <span style={{ color: "#d97706" }}>{a.prochaine_etape}</span></div>
          {(a.recommandations || []).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, color: "#16a34a", marginTop: 3 }}>
              <I d={IC.check} size={10} color="#16a34a" /> {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentRow({ a }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.on ? "#22c55e" : "#e5e7eb" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: a.on ? "#111827" : "#9ca3af" }}>{a.name}</div>
        <div style={{ fontSize: 10, color: "#d1d5db" }}>{a.os}</div>
      </div>
      <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{a.ip}</span>
    </div>
  );
}

function ERow({ e }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f9fafb", fontSize: 11 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: SEV_COLOR[e.severity] || "#9ca3af", flexShrink: 0 }} />
      <span style={{ color: "#374151", minWidth: 130, fontWeight: 500 }}>{e.type}</span>
      <span style={{ color: "#f97316", fontFamily: "monospace", minWidth: 100 }}>{e.source_ip}</span>
      <span style={{ color: "#d1d5db" }}>{e.timestamp?.substring(11, 19)}</span>
    </div>
  );
}

function Bars() {
  const vals = [28, 42, 22, 58, 38, 85, 70];
  const days = ["M","T","W","T","F","S","S"];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 52 }}>
        {vals.map((v, i) => <div key={i} style={{ flex: 1, height: `${v}%`, borderRadius: "4px 4px 0 0", background: i >= 5 ? "#111827" : i >= 3 ? "#d1d5db" : "#f3f4f6" }} />)}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
        {days.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: i >= 5 ? "#111827" : "#d1d5db" }}>{d}</div>)}
      </div>
    </div>
  );
}

function ElkDot({ s }) {
  const on = s?.status === "connected";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: on ? "#22c55e" : "#e5e7eb" }} />
      <span style={{ fontSize: 11, color: "#9ca3af" }}>{on ? "ELK connected" : "ELK offline"}</span>
    </div>
  );
}

function Empty({ msg }) {
  return <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#d1d5db" }}>{msg}</div>;
}

const S = {
  root:    { background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", fontSize: 13, color: "#111827" },
  topbar:  { background: "#fff", borderBottom: "1px solid #e5e7eb", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 10 },
  logoBox: { width: 28, height: 28, background: "#111827", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText:{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: 1 },
  logoSub: { fontSize: 11, color: "#9ca3af", marginLeft: 4 },
  topMid:  { display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 99, padding: "6px 16px", flex: 1, maxWidth: 360, margin: "0 20px" },
  topSearch:{ background: "none", border: "none", outline: "none", fontSize: 12, color: "#374151", width: "100%" },
  iconBtn: { width: 32, height: 32, borderRadius: "50%", background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  avatar:  { width: 32, height: 32, borderRadius: "50%", background: "#111827", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 },
  pill:    { display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 },
  body:    { display: "grid", gridTemplateColumns: "196px 1fr", minHeight: "calc(100vh - 54px)" },
  sidebar: { background: "#fff", borderRight: "1px solid #e5e7eb", padding: "10px 0" },
  navGroup:{ padding: "10px 20px 3px", fontSize: 10, fontWeight: 600, color: "#d1d5db", letterSpacing: 1 },
  navBtn:  { display: "flex", alignItems: "center", gap: 9, padding: "8px 14px", margin: "1px 8px", borderRadius: 99, border: "none", background: "transparent", cursor: "pointer", color: "#6b7280", fontSize: 12, width: "calc(100% - 16px)", textAlign: "left" },
  navOn:   { background: "#111827", color: "#fff" },
  main:    { padding: "22px", overflowY: "auto" },
  page:    { display: "flex", flexDirection: "column", gap: 14 },
  card:    { background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "16px 18px" },
  g4:      { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 },
  g2:      { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 },
  g3b:     { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  input:   { border: "1px solid #e5e7eb", borderRadius: 99, padding: "8px 14px", fontSize: 12, outline: "none", background: "#f9fafb", color: "#111827" },
  btnDark: { background: "#111827", color: "#fff", border: "none", borderRadius: 99, padding: "8px 18px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 },
  btnSm:   { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 99, padding: "4px 12px", fontSize: 11, cursor: "pointer", color: "#374151" },
  popup:   { position: "fixed", top: 16, right: 16, background: "#fff", border: "1px solid #fecaca", borderRadius: 14, padding: "12px 16px", zIndex: 999, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", maxWidth: 320 },
  popClose:{ background: "none", border: "none", cursor: "pointer", padding: 2, marginLeft: "auto" },
};