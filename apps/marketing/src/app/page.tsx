import Link from 'next/link';

const FEATURES = [
  { icon: '📋', title: 'Attendance & Leave', desc: 'Real-time class-wise and subject-wise attendance. Leave requests flow through a configurable approval chain with calendar sync.' },
  { icon: '💰', title: 'Fee Management', desc: 'Invoice generation, payment tracking, overdue alerts and per-student fee structure management.' },
  { icon: '🎓', title: 'Admissions', desc: 'Online application forms, document collection, multi-stage review workflows and seat allocation.' },
  { icon: '📅', title: 'Timetable', desc: 'Visual timetable builder for teachers and students. Period-wise scheduling with conflict detection.' },
  { icon: '📢', title: 'Announcements', desc: 'Role-targeted announcements pushed to teachers, students and parents in real time.' },
  { icon: '📊', title: 'Reports & Analytics', desc: 'Attendance summaries, fee collection reports and student-wise performance dashboards.' },
];

const ROLES = [
  { role: 'Super Admin',   color: 'bg-purple-100 text-purple-700',   desc: 'Full platform control — onboard schools, configure leave policies, manage subscriptions.' },
  { role: 'School Admin',  color: 'bg-blue-100 text-blue-700',       desc: 'Manage staff, fee structures, timetable and school-level settings.' },
  { role: 'Principal',     color: 'bg-teal-100 text-teal-700',       desc: 'Approve leaves, view dashboards, oversee academic operations.' },
  { role: 'HOD',           color: 'bg-cyan-100 text-cyan-700',       desc: 'Manage department attendance and leave approvals.' },
  { role: 'Teacher',       color: 'bg-emerald-100 text-emerald-700', desc: 'Take attendance, review student leaves, communicate with parents.' },
  { role: 'Parent',        color: 'bg-orange-100 text-orange-700',   desc: 'View child attendance, apply leave, pay fees and receive announcements.' },
  { role: 'Student',       color: 'bg-yellow-100 text-yellow-700',   desc: 'View timetable, attendance record, fee invoices and announcements.' },
];

const STATS = [
  { value: '10+', label: 'Modules' },
  { value: '7',   label: 'Role types' },
  { value: '∞',   label: 'Schools' },
  { value: '100%', label: 'Mobile-ready' },
];

const TECH_STACK = [
  { label: 'Frontend',  value: 'Next.js 14 · App Router · Tailwind CSS' },
  { label: 'Backend',   value: 'Next.js API Routes · REST' },
  { label: 'Database',  value: 'PostgreSQL (Neon) · Prisma ORM' },
  { label: 'Cache',     value: 'Redis (Upstash)' },
  { label: 'Auth',      value: 'JWT · SMS OTP via Twilio' },
  { label: 'Hosting',   value: 'Render' },
  { label: 'Analytics', value: 'Umami' },
];

const MOBILE_SCREENS = [
  { screen: 'Dashboard',    desc: 'Attendance summary, upcoming leaves, fee status' },
  { screen: 'Attendance',   desc: 'Monthly calendar with leave indicators' },
  { screen: 'Leave',        desc: 'Apply and track leave requests' },
  { screen: 'Fee',          desc: 'View invoices, pay online' },
  { screen: 'Announcements', desc: 'School notices and alerts' },
];

const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://app.yulaa.in';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">Y</div>
            <span className="font-display font-bold text-xl text-gray-900">Yulaa</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#roles" className="hover:text-brand-600 transition-colors">Who It&apos;s For</a>
            <a href="#product" className="hover:text-brand-600 transition-colors">Product</a>
            <a href="#mobile" className="hover:text-brand-600 transition-colors">Mobile App</a>
          </div>
          <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors">
            Open App →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-brand-50 to-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-100 text-brand-700 rounded-full text-xs font-semibold">
            🚀 Now available with Mobile App
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            School management,<br />
            <span className="text-brand-500">finally simple</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Yulaa is a complete multi-tenant school management platform — attendance, leave, fees, admissions, timetable and more. Built for schools of every size.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
            <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200">
              Start Free Trial
            </a>
            <a href="#features"
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-brand-300 hover:text-brand-600 transition-colors">
              Explore Features
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="max-w-2xl mx-auto mt-20 grid grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-bold text-brand-600">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-gray-900">Everything your school needs</h2>
            <p className="text-gray-500 mt-3 text-lg">One platform. Every module. Real-time sync across all roles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display font-semibold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-gray-900">Built for every role</h2>
            <p className="text-gray-500 mt-3 text-lg">Each user sees exactly what they need — no more, no less.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ROLES.map(r => (
              <div key={r.role} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${r.color}`}>{r.role}</span>
                <p className="text-sm text-gray-600 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product section */}
      <section id="product" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="font-display text-4xl font-bold text-gray-900">Yulaa School Management</h2>
              <p className="text-gray-500 text-lg leading-relaxed">
                A production-grade SaaS platform built with Next.js 14, PostgreSQL and Redis. Multi-tenant from day one — each school gets isolated data, custom workflows and their own branding.
              </p>
              <ul className="space-y-3">
                {[
                  'Multi-step leave approval with calendar sync',
                  'Subject-wise attendance tracking with lock on approved leave',
                  'Fee invoicing with payment tracking',
                  'Role-based access: 7 distinct user types',
                  'Excel upload for bulk holiday configuration',
                  'Real-time notifications via Redis',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors">
                Open Web App →
              </a>
            </div>
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl p-8 text-white space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-6">Tech Stack</div>
              {TECH_STACK.map(t => (
                <div key={t.label} className="flex items-start gap-4">
                  <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded w-24 shrink-0 text-center">{t.label}</span>
                  <span className="text-sm opacity-90">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App section */}
      <section id="mobile" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="bg-gray-900 rounded-3xl p-8 text-white space-y-4 order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-sm">Y</div>
              <span className="font-semibold">Yulaa Mobile</span>
              <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            {MOBILE_SCREENS.map(s => (
              <div key={s.screen} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{s.screen}</div>
                  <div className="text-xs text-gray-400">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6 order-1 lg:order-2">
            <h2 className="font-display text-4xl font-bold text-gray-900">Native mobile app</h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              The Yulaa mobile app (built with Expo) connects directly to the same backend as the web platform — same API, same database, same authentication. Nothing duplicated.
            </p>
            <ul className="space-y-3">
              {[
                'Available on iOS and Android via Expo',
                'Shares the exact same REST API as the web app',
                'JWT authentication — log in with phone OTP',
                'Offline-capable attendance view',
                'Push notifications for leave status updates',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-display text-4xl font-bold text-white">Ready to modernise your school?</h2>
          <p className="text-brand-200 text-lg">Get started in minutes. No setup fees. Cancel anytime.</p>
          <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-white text-brand-700 rounded-xl font-bold text-lg hover:bg-brand-50 transition-colors shadow-xl">
            Start Free Trial →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-xs">Y</div>
            <span className="text-white font-semibold">Yulaa</span>
          </div>
          <div className="text-sm">© {new Date().getFullYear()} Yulaa. School management platform.</div>
          <a href={WEB_APP_URL} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">Open App →</a>
        </div>
      </footer>
    </div>
  );
}
