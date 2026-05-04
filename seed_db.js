const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'backend', 'nids.db');
const db = new Database(dbPath);

// Insert test threat data
const stmt = db.prepare(`
  INSERT INTO threat_log (id, timestamp, src_ip, dst_ip, protocol, label, confidence, is_blocked)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const threats = [
  ['DoS', 97.5],
  ['Probe', 89.3],
  ['DoS', 94.2],
  ['U2R (Root Access)', 92.1],
  ['Normal', 76.4],
  ['Probe', 85.6],
  ['DDoS (Ping of Death)', 96.8],
  ['DoS', 98.1],
  ['Probe', 87.9],
  ['Normal', 81.2],
];

const srcIps = [
  '192.168.1.100', '10.0.0.50', '172.16.0.25',
  '203.0.113.45', '198.51.100.78', '192.168.1.200'
];

const dstIps = [
  '192.168.1.1', '10.0.0.1', '172.16.0.1',
  '8.8.8.8', '1.1.1.1'
];

const protocols = ['TCP', 'UDP', 'ICMP'];

let count = 0;
for (let i = 0; i < 10; i++) {
  const [label, conf] = threats[i % threats.length];
  const now = new Date();
  const timestamp = new Date(now.getTime() - (i + 1) * 60000).toISOString();

  const srcIp = srcIps[Math.floor(Math.random() * srcIps.length)];
  const dstIp = dstIps[Math.floor(Math.random() * dstIps.length)];
  const proto = protocols[Math.floor(Math.random() * protocols.length)];

  try {
    stmt.run(uuidv4(), timestamp, srcIp, dstIp, proto, label, conf, 0);
    console.log(`[${i+1}] ${label} (${conf}%) from ${srcIp}`);
    count++;
  } catch (e) {
    console.error(`Error inserting row ${i+1}:`, e.message);
  }
}

db.close();
console.log(`\n[OK] ${count} threat logs inserted`);
