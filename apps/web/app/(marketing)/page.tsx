import Link from 'next/link';
import { ArrowRight, Radar, Brain, Coins } from 'lucide-react';
import EtherealBeamsHero from '@/components/ui/ethereal-beams-hero';

const features = [
  {
    icon: Radar,
    title: 'Autonomous scanning',
    body: 'Tonyx watches STON.fi pools and crosschain venues every 60 seconds, ranking opportunities by real net gain after every fee.',
  },
  {
    icon: Brain,
    title: 'Mira AI reasoning',
    body: 'Every recommendation is evaluated and explained in plain language by Mira. You see the why before you ever approve.',
  },
  {
    icon: Coins,
    title: 'x402 micropayments',
    body: 'A small, transparent fee per executed rebalance. No subscriptions, no spreads. The agent earns only when you earn.',
  },
];

const steps = [
  { n: '01', title: 'Connect wallet', body: 'Link your TON wallet in seconds via TON Connect or an embedded wallet.' },
  { n: '02', title: 'Set policy', body: 'Define your spending floor, minimum gain, cooldown, and approval mode — once.' },
  { n: '03', title: 'Agent executes', body: 'Tonyx finds qualifying rebalances and routes them through STON.fi Omniston.' },
  { n: '04', title: 'You earn', body: 'Yield lands in your wallet. Track every run, fee, and transaction in the dashboard.' },
];

export default function LandingPage() {
  return (
    <main className="bg-black text-white">
      {/* Hero — defines the global theme */}
      <EtherealBeamsHero />

      {/* Features */}
      <section id="features" className="relative border-t border-white/10 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              An agent, not a dashboard
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Tonyx does the work. You set the rules and approve the moves that matter.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-colors hover:border-white/20"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="mt-3 text-white/60">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative border-t border-white/10 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-white/60">From idle balance to earning yield in four steps.</p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                <div className="mb-4 text-sm font-mono text-white/40">{s.n}</div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative border-t border-white/10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Start earning yield today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            Connect your wallet, set a policy in two minutes, and let Tonyx handle the rest.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-colors hover:bg-gray-100"
            >
              Launch app
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-8">
          <span className="text-lg font-bold">Tonyx</span>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
          </div>
          <span className="text-sm text-white/40">Built on TON</span>
        </div>
      </footer>
    </main>
  );
}
