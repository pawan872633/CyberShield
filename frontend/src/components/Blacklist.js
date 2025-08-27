// src/components/Blacklist.js
import React, { useEffect, useMemo, useState } from "react";
import { getBlacklist, addBlacklist, deleteBlacklist } from "../api";

function Blacklist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [serverQuery, setServerQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const load = async () => {
    setErr(""); setOk(""); setLoading(true);
    try {
      const res = await getBlacklist(serverQuery.trim() || undefined);
      setItems(res.data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!ip.trim()) return setErr("Please enter an IP to block.");
    setErr(""); setOk("");
    try {
      const res = await addBlacklist({ ip: ip.trim(), reason: reason.trim() || "manual" });
      setOk(`Blocked ${res.data.ip} (${res.data.reason || "-"})`);
      setIp("");
      setReason("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleUnblock = async (targetIp) => {
    if (!window.confirm(`Unblock & remove ${targetIp} from blacklist?`)) return;
    setErr(""); setOk("");
    try {
      const res = await deleteBlacklist(targetIp);
      setOk(`Unblocked ${res.data.ip}`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const filtered = useMemo(() => {
    const f = clientFilter.trim().toLowerCase();
    if (!f) return items;
    return items.filter(
      (r) =>
        (r.ip || "").toLowerCase().includes(f) ||
        (r.reason || "").toLowerCase().includes(f)
    );
  }, [items, clientFilter]);

  return (
    <div className="animate__animated animate__fadeInUp">
      <div className="card custom-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="m-0">🚫 Blacklist Management</h2>
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search (server)"
              value={serverQuery}
              onChange={(e) => setServerQuery(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button className="btn btn-outline-info btn-sm" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </button>
          </div>
        </div>
        <p className="text-muted">
          Block suspicious IPs and remove them to automatically clear Windows Firewall rules.
        </p>

        {err && <div className="alert alert-danger py-2">{err}</div>}
        {ok && <div className="alert alert-success py-2">{ok}</div>}

        {/* Add form */}
        <form className="row g-2 align-items-end mb-3" onSubmit={handleAdd}>
          <div className="col-12 col-md-4">
            <label className="form-label small">IP address</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 203.0.113.5"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small">Reason (optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="manual / abuse / brute-force"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-2">
            <button type="submit" className="btn btn-danger w-100">
              Block Now
            </button>
          </div>

          <div className="col-12 col-md-2">
            <label className="form-label small">Filter (client)</label>
            <input
              type="text"
              className="form-control"
              placeholder="filter…"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
          </div>
        </form>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-dark table-striped table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>IP</th>
                <th>Reason</th>
                <th>Created</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-3">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-3">Not Found</td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={`${r.id}-${r.ip}`}>
                    <td>{idx + 1}</td>
                    <td className="fw-semibold">{r.ip}</td>
                    <td>{r.reason || "-"}</td>
                    <td className="text-nowrap">{r.created_at}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleUnblock(r.ip)}
                        title="Unblock & delete"
                      >
                        🗑 Unblock & Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default Blacklist;
