import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '../services/api';
import { TrendingUp, Users, IndianRupee, Calendar } from 'lucide-react';

Chart.register(...registerables);

// Default chart data used as fallback
const defaultChartData = {
  dailyPatients: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [35, 42, 38, 45, 50, 28, 22] },
  revenue: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], data: [95000, 105000, 112000, 128500, 118000, 135000] },
  appointments: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [28, 35, 32, 40, 42, 18, 15] },
  departmentVisits: { labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Surgery', 'Emergency'], data: [180, 120, 150, 95, 110, 200] },
};

function ChartComponent({ id, type, labels, data, color, bgColor }: {
  id: string; type: 'bar' | 'line' | 'doughnut'; labels: string[]; data: number[]; color: string; bgColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, 'transparent');

    chartRef.current = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{
          label: 'Value',
          data,
          backgroundColor: type === 'doughnut'
            ? ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
            : type === 'bar' ? color : gradient,
          borderColor: type === 'doughnut' ? 'transparent' : color,
          borderWidth: type === 'line' ? 2.5 : 0,
          borderRadius: type === 'bar' ? 6 : 0,
          fill: type === 'line',
          tension: 0.4,
          pointRadius: type === 'line' ? 4 : 0,
          pointBackgroundColor: color,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type === 'doughnut', position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } },
        },
        scales: type === 'doughnut' ? {} : {
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
          y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 12 } } }
        }
      }
    });

    return () => { chartRef.current?.destroy(); };
  }, [type, labels, data, color, bgColor]);

  return <canvas ref={canvasRef} id={id} />;
}

export default function Reports() {
  const [chartData, setChartData] = useState(defaultChartData);

  useEffect(() => {
    const loadCharts = async () => {
      try {
        const res = await api.getDashboardCharts();
        if (res.data) setChartData(res.data);
      } catch {
        // Use default chart data
      }
    };
    loadCharts();
  }, []);

  const summaryStats = [
    { label: 'Total Revenue', value: '₹12.8L', change: '+8.2%', icon: <IndianRupee size={20} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Total Patients', value: '1,248', change: '+12%', icon: <Users size={20} />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
    { label: 'Appointments', value: '342', change: '+5.3%', icon: <Calendar size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { label: 'Growth Rate', value: '23%', change: '+2.1%', icon: <TrendingUp size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <p>Comprehensive insights into healthcare operations</p>
      </div>

      <div className="stats-grid">
        {summaryStats.map((s, i) => (
          <div className="glass-card stat-card" key={i}>
            <div className="stat-info">
              <h3>{s.label}</h3>
              <div className="stat-value">{s.value}</div>
              <div className="stat-change positive">{s.change}</div>
            </div>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="glass-card chart-card">
          <h3>📊 Daily Patient Visits</h3>
          <div className="chart-wrapper">
            <ChartComponent id="daily-patients" type="bar" labels={chartData.dailyPatients.labels}
              data={chartData.dailyPatients.data} color="rgba(14,165,233,0.8)" bgColor="rgba(14,165,233,0.1)" />
          </div>
        </div>
        <div className="glass-card chart-card">
          <h3>💰 Monthly Revenue</h3>
          <div className="chart-wrapper">
            <ChartComponent id="revenue" type="line" labels={chartData.revenue.labels}
              data={chartData.revenue.data} color="#10b981" bgColor="rgba(16,185,129,0.15)" />
          </div>
        </div>
        <div className="glass-card chart-card">
          <h3>📅 Weekly Appointments</h3>
          <div className="chart-wrapper">
            <ChartComponent id="appointments" type="bar" labels={chartData.appointments.labels}
              data={chartData.appointments.data} color="rgba(139,92,246,0.8)" bgColor="rgba(139,92,246,0.1)" />
          </div>
        </div>
        <div className="glass-card chart-card">
          <h3>🏥 Department-wise Visits</h3>
          <div className="chart-wrapper">
            <ChartComponent id="departments" type="doughnut" labels={chartData.departmentVisits.labels}
              data={chartData.departmentVisits.data} color="#0ea5e9" bgColor="transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
