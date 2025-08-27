import React, { useState } from "react";
import { detectThreat, getDetections } from "../api";

function Dashboard({ user }) {
  const [fields, setFields] = useState({
    bytes_in: "",
    bytes_out: "",
    packets: "",
    duration: "",
    src_port: "",
    dest_port: "",
  });
  const [csv, setCsv] = useState(""); // e.g. "1200,800,40,3,54321,443"
  const [useCsv, setUseCsv] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [blockTarget, setBlockTarget] = useState("dest"); // 👈 toggle

  const [result, setResult] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const FEATURE_ORDER = [
    "bytes_in",
    "bytes_out",
    "packets",
    "duration",
    "src_port",
    "dest_port",
  ];

  const parseCsv = (text) =>
    text
      .split(",")
      .map((n) => Number(n.trim()))
      .filter((n) => !Number.isNaN(n));

  const buildFeatureArray = () => {
    if (useCsv) {
      const arr = parseCsv(csv);
      if (arr.length !== 6) {
        throw new Error(
          "Please enter exactly 6 numbers in CSV: bytes_in, bytes_out, packets, duration, src_port, dest_port"
        );
      }
      return arr;
    }
    const arr = FEATURE_ORDER.map((k) => Number(String(fields[k]).trim()));
    if (arr.some((v) => Number.isNaN(v))) {
      throw new Error("All six fields must be valid numbers (no blanks).");
    }
    return arr;
  };

  const handleDetect = async () => {
    setErrMsg("");
    setLoading(true);
    setResult(null);
    try {
      const featureArray = buildFeatureArray();
      const res = await detectThreat({
        src_ip: "192.168.1.10",
        dest_ip: "8.8.8.8",
        features: featureArray,
        threshold: Number(threshold),
        block_target: blockTarget, // 👈 send toggle
      });
      setResult(res.data);
    } catch (err) {
      setErrMsg(err.message || "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetDetections = async () => {
    setListLoading(true);
    try {
      const res = await getDetections();
      setDetections(res.data);
    } catch (err) {
      setErrMsg(err.message || "Failed to load detections");
    } finally {
      setListLoading(false);
    }
  };

  const exportCsv = () => {
    if (!detections.length) return alert("No data");
    const header = ["id", "src_ip", "dest_ip", "is_malicious", "score", "created_at"];
    const rows = detections.map((d) => [
      d.id,
      d.src_ip,
      d.dest_ip || "",
      d.is_malicious,
      d.score,
      d.created_at,
    ]);
    const csvText = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "detections.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickFill = () => {
    setFields({
      bytes_in: 1200,
      bytes_out: 800,
      packets: 40,
      duration: 3,
      src_port: 54321,
      dest_port: 443,
    });
    setCsv("1200,800,40,3,54321,443");
  };

  return (
    <div className="animate__animated animate__fadeInUp">
      <div className="card custom-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="m-0">📊 CyberShield Dashboard</h2>
          <span className="badge bg-info bg-opacity-75">Welcome, {user.username}</span>
        </div>
        <p className="text-muted">Run anomaly detection and review history.</p>

        {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}

        <div className="row g-3">
          {/* Left: Detection form */}
          <div className="col-12 col-lg-6">
            <div className="p-3 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-3">Run Threat Detection</h5>
                <button className="btn btn-outline-light btn-sm" onClick={quickFill}>
                  Quick Fill
                </button>
              </div>

              {/* Threshold slider */}
              <div className="mb-2">
                <label className="form-label small">
                  Decision Threshold: {Number(threshold).toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  className="form-range"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>

              {/* Block target toggle */}
              <div className="mb-2">
                <label className="form-label small">Block Target:</label>
                <div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      id="blockDest"
                      name="blockTarget"
                      value="dest"
                      checked={blockTarget === "dest"}
                      onChange={(e) => setBlockTarget(e.target.value)}
                      className="form-check-input"
                    />
                    <label htmlFor="blockDest" className="form-check-label">Destination IP</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      id="blockSrc"
                      name="blockTarget"
                      value="src"
                      checked={blockTarget === "src"}
                      onChange={(e) => setBlockTarget(e.target.value)}
                      className="form-check-input"
                    />
                    <label htmlFor="blockSrc" className="form-check-label">Source IP</label>
                  </div>
                </div>
              </div>

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="useCsv"
                  checked={useCsv}
                  onChange={(e) => setUseCsv(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="useCsv">
                  Use CSV input instead of individual fields
                </label>
              </div>

              {!useCsv ? (
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label small">bytes_in</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fields.bytes_in}
                      onChange={(e) => setFields({ ...fields, bytes_in: e.target.value })}
                      placeholder="e.g. 1200"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">bytes_out</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fields.bytes_out}
                      onChange={(e) => setFields({ ...fields, bytes_out: e.target.value })}
                      placeholder="e.g. 800"
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small">packets</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fields.packets}
                      onChange={(e) => setFields({ ...fields, packets: e.target.value })}
                      placeholder="e.g. 40"
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small">duration</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fields.duration}
                      onChange={(e) => setFields({ ...fields, duration: e.target.value })}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small">src_port</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fields.src_port}
                      onChange={(e) => setFields({ ...fields, src_port: e.target.value })}
                      placeholder="e.g. 54321"
                    />
                  </div>
                  <div className="col-12 mt-2">
                    <label className="form-label small">dest_port</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fields.dest_port}
                      onChange={(e) => setFields({ ...fields, dest_port: e.target.value })}
                      placeholder="e.g. 443"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="form-label small">
                    CSV (bytes_in, bytes_out, packets, duration, src_port, dest_port)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    placeholder="1200,800,40,3,54321,443"
                  />
                </div>
              )}

              <button
                onClick={handleDetect}
                className="btn btn-custom mt-3 w-100"
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Detect"}
              </button>

              {result && (
                <div className="alert mt-3 animate__animated animate__fadeIn">
                  <h6 className="mb-2">Result</h6>
                  <div className="d-flex gap-3 flex-wrap">
                    <span className="badge bg-secondary">ID: {result.id}</span>
                    <span className={`badge ${result.is_malicious ? "bg-danger" : "bg-success"}`}>
                      {result.is_malicious ? "⚠️ Malicious" : "✅ Safe"}
                    </span>
                    <span className="badge bg-primary">
                      Score: {Number(result.score).toFixed(6)}
                    </span>
                    <span className="badge bg-dark">
                      Threshold: {Number(threshold).toFixed(2)}
                    </span>
                    <span className="badge bg-warning text-dark">
                      Block: {blockTarget.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: History */}
          <div className="col-12 col-lg-6">
            <div className="p-3 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-3">Detection History</h5>
                <div>
                  <button
                    onClick={handleGetDetections}
                    className="btn btn-outline-info btn-sm"
                    disabled={listLoading}
                  >
                    {listLoading ? "Loading..." : "Refresh"}
                  </button>
                  <button
                    onClick={exportCsv}
                    className="btn btn-outline-light btn-sm ms-2"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-dark table-striped table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Source → Dest</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detections.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-3">
                          No records. Click Refresh.
                        </td>
                      </tr>
                    ) : (
                      detections.map((d) => (
                        <tr key={d.id}>
                          <td>{d.id}</td>
                          <td>{d.src_ip} → {d.dest_ip || "-"}</td>
                          <td>
                            <span className={`badge ${d.is_malicious ? "bg-danger" : "bg-success"}`}>
                              {d.is_malicious ? "Malicious" : "Safe"}
                            </span>
                          </td>
                          <td>{Number(d.score).toFixed(4)}</td>
                          <td className="text-nowrap">{d.created_at}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
