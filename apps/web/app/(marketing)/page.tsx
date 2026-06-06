import Link from 'next/link';
import {
  ArrowRight,
  Radar,
  Brain,
  Coins,
  TrendingUp,
  Waypoints,
  ShieldCheck,
  Wallet,
  HelpCircle,
  Send,
  GitFork,
  MessageCircle,
} from 'lucide-react';
import EtherealBeamsHero from '@/components/ui/ethereal-beams-hero';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const capabilities = [
  {
    title: 'Real-time scanning',
    description:
      'Tonyx watches STON.fi pools and crosschain venues every 60 seconds so you never miss a better rate.',
    icon: Radar,
  },
  {
    title: 'Net-gain ranking',
    description:
      'Every opportunity is scored on real profit after swap fees, gas, and slippage — not headline APY.',
    icon: TrendingUp,
  },
  {
    title: 'Mira AI reasoning',
    description:
      'Each move is evaluated and explained in plain language, so you understand the why before approving.',
    icon: Brain,
  },
  {
    title: 'Omniston routing',
    description:
      'Trades route through STON.fi Omniston for deep liquidity and the best available execution on TON.',
    icon: Waypoints,
  },
  {
    title: 'Policy guardrails',
    description:
      'Set a spending floor, minimum gain, cooldown, and approval mode once. The agent never crosses them.',
    icon: ShieldCheck,
  },
  {
    title: 'x402 micropayments',
    description:
      'A small, transparent fee per executed rebalance. No subscriptions, no spreads — pay only on results.',
    icon: Coins,
  },
];

const faqs = [
  {
    question: 'What is Tonyx?',
    answer:
      'Tonyx is an autonomous yield optimization agent on the TON blockchain. It scans liquidity venues, reasons about the best moves with Mira AI, and rebalances your funds to keep them earning.',
    icon: HelpCircle,
  },
  {
    question: 'Do I keep custody of my funds?',
    answer:
      'Yes. You connect your own TON wallet and approve the moves that matter. Tonyx never takes custody of your assets.',
    icon: Wallet,
  },
  {
    question: 'How does the agent decide when to rebalance?',
    answer:
      'Every 60 seconds it ranks opportunities by real net gain after every fee, then checks the move against your policy before acting or asking for approval.',
    icon: Brain,
  },
  {
    question: 'What does it cost?',
    answer:
      'A small, transparent x402 micropayment per executed rebalance. No subscriptions and no hidden spreads — the agent earns only when you earn.',
    icon: Coins,
  },
  {
    question: 'Which venues are supported?',
    answer:
      'Tonyx routes trades through STON.fi Omniston for deep liquidity on TON, with crosschain venues monitored alongside native pools.',
    icon: Waypoints,
  },
  {
    question: 'Can I limit what the agent does?',
    answer:
      'Absolutely. Set a spending floor, minimum gain, cooldown, and approval mode once, and Tonyx will never cross those guardrails.',
    icon: ShieldCheck,
  },
];

const footerLinks = [
  { title: 'About', href: '/#about' },
  { title: 'Contact', href: '/#contact' },
  { title: 'Terms of Service', href: '/#terms' },
  { title: 'Privacy Policy', href: '/#privacy' },
];

const footerSocials = [
  { label: 'Telegram', href: '/', icon: Send },
  { label: 'Community', href: '/', icon: MessageCircle },
  { label: 'GitHub', href: '/', icon: GitFork },
];

export default function LandingPage() {
  return (
    <main className="bg-black text-white">
      {/* Hero — defines the global theme */}
      <EtherealBeamsHero />

      {/* Capabilities grid */}
      <section id="how-it-works" className="mx-auto flex max-w-7xl flex-col px-6 py-20">
        <h2 className="text-pretty text-center font-medium text-4xl tracking-[-0.04em] sm:text-[2.75rem]">
          Simplify your yield
        </h2>
        <p className="mt-3 text-pretty text-center text-xl text-muted-foreground sm:text-2xl">
          One agent that handles the whole stack
        </p>

        <div className="mt-16 grid grid-cols-1 gap-1.5 border border-white/10 bg-white/[0.03] p-1.5 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((feature, index) => (
            <div
              className="relative -m-px border border-white/10 bg-black px-5 py-7"
              key={feature.title}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-medium text-lg tracking-[-0.005em]">
                {feature.title}
              </h3>
              <p className="mt-2 text-foreground/80">{feature.description}</p>
              <Badge
                className="absolute top-0 right-0 rounded-none border-t-0 border-r-0 border-white/10 bg-white/5 font-mono"
                variant="outline"
              >
                {(index + 1).toString().padStart(2, '0')}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl px-6 py-12 sm:py-20">
        <h2 className="text-balance text-center font-medium text-4xl tracking-[-0.04em] sm:text-[2.75rem]">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-balance text-center text-lg text-muted-foreground md:text-2xl md:tracking-[-0.015em]">
          Everything you need to know about how Tonyx works
        </p>

        <div className="mx-auto mt-12 max-w-2xl sm:mt-16">
          <Accordion className="space-y-4" collapsible type="single">
            {faqs.map((faq) => (
              <AccordionItem
                className="rounded-xl border-0 bg-white/5 px-5"
                key={faq.question}
                value={faq.question}
              >
                <AccordionTrigger className="text-lg">
                  <div className="flex items-center gap-2">
                    <faq.icon className="mr-2.5 size-5" />
                    {faq.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="relative pl-10 text-base">
                  {faq.answer}
                  <div className="absolute inset-y-0 left-2.5 border-s border-dashed border-white/10" />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative py-24">
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
      <footer className="border-t border-white/10 px-6 py-2">
        <div className="mx-auto w-full max-w-7xl divide-y divide-white/10">
          <div className="flex flex-col items-center justify-between gap-4 px-2 pb-5 pt-3 sm:flex-row">
            <Link className="flex items-center gap-2" href="/">
              <span className="text-xl font-medium">Tonyx</span>
            </Link>

            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
              {footerLinks.map(({ title, href }) => (
                <li key={title}>
                  <Link href={href} className="text-muted-foreground transition-colors hover:text-white">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col-reverse items-center justify-between gap-4 px-2 pb-2 pt-4 sm:flex-row">
            <p className="text-sm font-medium text-muted-foreground">
              Copyright &copy; {new Date().getFullYear()} Tonyx. Built on TON.
            </p>

            <div className="flex items-center gap-4">
              {footerSocials.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} aria-label={label}>
                  <Icon className="h-5 w-5 text-muted-foreground transition-colors hover:text-white" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
