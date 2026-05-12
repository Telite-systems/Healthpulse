import ChatbotWidget from '../components/ChatbotWidget';

export default function ChatbotPage() {
  return (
    <div>
      <div className="page-header">
        <h1>AI Chatbot Assistant</h1>
        <p>Get instant answers about patients, appointments, and billing</p>
      </div>

      <div className="glass-card" style={{ padding: 32, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--accent-gradient)', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
          marginBottom: 20, boxShadow: '0 0 30px rgba(14,165,233,0.3)'
        }}>🤖</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>HealthPulse AI Assistant</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
          Your intelligent healthcare companion. Ask about patient records, appointment schedules,
          billing information, or any healthcare data queries.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '📋', title: 'Patient Info', desc: 'Look up patient records' },
            { icon: '📅', title: 'Appointments', desc: 'Check schedules' },
            { icon: '💳', title: 'Billing', desc: 'View payment status' },
            { icon: '📊', title: 'Reports', desc: 'Get quick insights' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: 16, background: 'var(--bg-input)', borderRadius: 12,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
          💡 Click the chat bubble in the bottom-right corner to start a conversation
        </p>
      </div>
    </div>
  );
}
