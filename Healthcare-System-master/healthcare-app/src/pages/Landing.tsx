import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Shield, Brain, BarChart3, Users, Stethoscope, Database, Heart, Clock, Phone, MapPin, Mail, ArrowRight } from 'lucide-react';

function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <>{count.toLocaleString()}{suffix}</>;
}

function FloatingParticle({ delay, size, x, y }: { delay: number; size: number; x: number; y: number }) {
  return (
    <div
      className="floating-particle"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const particles = Array.from({ length: 15 }, () => ({
    delay: Math.random() * 5,
    size: 2 + Math.random() * 3,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));

  return (
    <div className={`landing-page ${isVisible ? 'visible' : ''}`}>
      {/* Animated particles */}
      <div className="particles-container">
        {particles.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}
      </div>

      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="glow-orb glow-orb-3" />

      {/* Top info bar */}
      <div className="landing-top-bar">
        <div className="top-bar-inner">
          <div className="top-bar-left">
            <span><Phone size={12} /> Emergency: <strong>108</strong></span>
            <span className="top-bar-divider">|</span>
            <span><Clock size={12} /> 24/7 Emergency Services</span>
          </div>
          <div className="top-bar-right">
            <span><Mail size={12} /> info@healthpulse.care</span>
            <span className="top-bar-divider">|</span>
            <span><MapPin size={12} /> Multiple Locations</span>
          </div>
        </div>
      </div>

      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="logo-icon" style={{ position: 'relative' }}>
            <span className="logo-pulse" />
            <Heart size={22} strokeWidth={2.5} />
          </div>
          <span>HealthPulse</span>
        </div>
        <div className="landing-nav-links">
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <a href="#stats">Stats</a>
          <a href="#departments">Departments</a>
          <button className="btn btn-outline btn-sm nav-cta" onClick={() => navigate('/login')}>
            Portal Login
          </button>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="badge-dot" />
            <Heart size={13} />
            Trusted by 50+ Hospitals Nationwide
          </div>
          <h1 className="hero-title animate-in" style={{ animationDelay: '0.2s' }}>
            Compassionate Care,<br />
            <span className="gradient-text animated-gradient">Powered by Innovation</span>
          </h1>
          <p className="hero-desc animate-in" style={{ animationDelay: '0.35s' }}>
            Experience world-class healthcare with cutting-edge technology. Our smart platform
            connects patients, doctors, and administrators for seamless, efficient,
            and compassionate medical care.
          </p>
          <div className="hero-buttons animate-in" style={{ animationDelay: '0.45s' }}>
            <button className="btn btn-primary btn-glow btn-lg" onClick={() => navigate('/login')}>
              Access Patient Portal
              <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline btn-shimmer" onClick={() => navigate('/login')}>
              Staff Dashboard
            </button>
          </div>

          {/* Compliance badges */}
          <div className="hero-trust-badges animate-in" style={{ animationDelay: '0.5s' }}>
            <div className="trust-badge">
              <Shield size={16} />
              <span>HIPAA Compliant</span>
            </div>
            <div className="trust-badge">
              <Shield size={16} />
              <span>ISO 27001</span>
            </div>
            <div className="trust-badge">
              <Shield size={16} />
              <span>256-bit Encrypted</span>
            </div>
          </div>

          {/* Live Stats */}
          <div className="hero-stats animate-in" id="stats" style={{ animationDelay: '0.55s' }}>
            {[
              { value: 1248, label: 'Active Patients', suffix: '+' },
              { value: 98, label: 'Uptime', suffix: '%' },
              { value: 24, label: 'Departments', suffix: '' },
              { value: 150, label: 'Expert Doctors', suffix: '+' },
            ].map((stat, i) => (
              <div className="hero-stat" key={i}>
                <div className="hero-stat-value">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="hero-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="hero-features" id="services">
            {[
              { icon: <Users size={28} />, title: 'Patient Management', desc: 'Complete patient lifecycle from registration to follow-ups with smart digital records.', bg: 'rgba(8,145,178,0.12)', accent: '#0891b2' },
              { icon: <Brain size={28} />, title: 'AI Diagnostics', desc: 'Intelligent AI assistant for instant health queries, appointment scheduling & guided triage.', bg: 'rgba(99,102,241,0.12)', accent: '#6366f1' },
              { icon: <Stethoscope size={28} />, title: 'Telemedicine', desc: 'Secure virtual consultations connecting patients with specialists from anywhere.', bg: 'rgba(5,150,105,0.12)', accent: '#059669' },
              { icon: <BarChart3 size={28} />, title: 'Clinical Analytics', desc: 'Real-time dashboards with patient trends, revenue tracking, and operational insights.', bg: 'rgba(217,119,6,0.12)', accent: '#d97706' },
              { icon: <Shield size={28} />, title: 'Data Security', desc: 'Enterprise-grade security with JWT authentication, role-based access & audit trails.', bg: 'rgba(220,38,38,0.12)', accent: '#dc2626' },
              { icon: <Database size={28} />, title: 'Health Records', desc: 'Centralized digital health records with real-time sync across all departments.', bg: 'rgba(6,182,212,0.12)', accent: '#06b6d4' },
            ].map((f, i) => (
              <div className="hero-feature-card animate-in" key={i} style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                <div className="feature-card-glow" style={{ background: f.accent }} />
                <div className="feature-icon" style={{ background: f.bg, color: f.accent }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Why Choose Us */}
          <div className="why-choose-section animate-in" id="about" style={{ animationDelay: '1.1s' }}>
            <h2 className="section-title">Why Choose HealthPulse?</h2>
            <p className="section-subtitle">We combine advanced technology with compassionate care to deliver exceptional healthcare experiences.</p>
            <div className="why-cards">
              {[
                { icon: '🏥', title: 'State-of-the-Art Facilities', desc: 'Modern infrastructure equipped with the latest medical technology.' },
                { icon: '👨‍⚕️', title: 'Expert Medical Team', desc: '150+ specialists across 24 departments providing world-class care.' },
                { icon: '🔬', title: 'Research & Innovation', desc: 'Continuous investment in medical research and technological advancement.' },
                { icon: '💚', title: 'Patient-First Approach', desc: 'Every decision is guided by our commitment to patient well-being.' },
              ].map((item, i) => (
                <div className="why-card" key={i}>
                  <span className="why-card-icon">{item.icon}</span>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div className="departments-section animate-in" id="departments" style={{ animationDelay: '1.2s' }}>
            <h2 className="section-title">Our Departments</h2>
            <div className="dept-grid">
              {['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics', 'Dermatology', 'Ophthalmology', 'ENT'].map((dept, i) => (
                <div className="dept-chip" key={i}>{dept}</div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="tech-stack animate-in" style={{ animationDelay: '1.3s' }}>
            <span className="tech-label">Powered By</span>
            <div className="tech-badges">
              {['React', 'TypeScript', 'Real-time Sync', 'JWT Auth', 'HIPAA Compliant', 'AI/ML'].map((tech, i) => (
                <span className="tech-badge" key={i}>{tech}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <Heart size={18} />
              <span>HealthPulse</span>
            </div>
            <p>Compassionate care, powered by innovation. Serving communities with excellence since 2020.</p>
          </div>
          <div className="footer-links-group">
            <h5>Quick Links</h5>
            <a href="#services">Our Services</a>
            <a href="#departments">Departments</a>
            <a href="#about">About Us</a>
          </div>
          <div className="footer-links-group">
            <h5>For Patients</h5>
            <a href="#" onClick={() => navigate('/login')}>Patient Portal</a>
            <a href="#" onClick={() => navigate('/login')}>Book Appointment</a>
            <a href="#" onClick={() => navigate('/login')}>Health Records</a>
          </div>
          <div className="footer-links-group">
            <h5>Contact</h5>
            <a href="#">Emergency: 108</a>
            <a href="#">info@healthpulse.care</a>
            <a href="#">+91 1800-XXX-XXXX</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 HealthPulse Medical Systems. All rights reserved.</span>
          <span>Privacy Policy • Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}
