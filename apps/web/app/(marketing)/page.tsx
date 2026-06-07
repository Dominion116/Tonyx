import Link from 'next/link';
import {
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
import CTA from '@/components/sections/cta';
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
      'Every opportunity is scored on real profit after swap fees, gas, and slippage, not headline APY.',
    icon: TrendingUp,
  },
  {
    title: 'Transparent advisor reasoning',
    description:
      'Each move is scored and explained in plain language by a deterministic advisor engine, so you understand the why before approving — and you can always ask Mira for a second opinion.',
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
      'A small, transparent fee per executed rebalance. No subscriptions, no spreads. Pay only on results.',
    icon: Coins,
  },
];

const faqs = [
  {
    question: 'What is Tonyx?',
    answer:
      'Tonyx is an autonomous yield optimization agent on the TON blockchain. It scans liquidity venues, weighs every move with a transparent advisor engine, and rebalances your funds to keep them earning — with a one-tap option to ask Mira for a second opinion on any proposal.',
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
      'A small, transparent x402 micropayment per executed rebalance. No subscriptions and no hidden spreads. The agent earns only when you earn.',
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
      {/* Hero: defines the global theme */}
      <EtherealBeamsHero />

      {/* Capabilities grid */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20 sm:py-28 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Simplify your yield
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One agent that handles the whole stack.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-1.5 border border-white/10 bg-white/[0.03] p-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((feature, index) => (
            <div
              className="relative -m-px border border-white/10 bg-black px-6 py-7"
              key={feature.title}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-medium tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
              <Badge
                className="absolute right-0 top-0 rounded-none border-r-0 border-t-0 border-white/10 bg-white/5 font-mono"
                variant="outline"
              >
                {(index + 1).toString().padStart(2, '0')}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20 sm:py-28 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about how Tonyx works.
          </p>
        </div>

        <div className="mt-16">
          <Accordion className="space-y-4" collapsible type="single">
            {faqs.map((faq) => (
              <AccordionItem
                className="rounded-xl border-0 bg-white/5 px-5"
                key={faq.question}
                value={faq.question}
              >
                <AccordionTrigger className="text-base sm:text-lg">
                  <span className="flex items-center gap-3">
                    <faq.icon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="relative pl-8 text-sm leading-relaxed sm:text-base">
                  {faq.answer}
                  <span className="absolute inset-y-0 left-2.5 border-s border-dashed border-white/10" />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA band */}
      <CTA />

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl divide-y divide-white/10">
          <div className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
            <Link
              href="/"
              className="rounded-md text-xl font-bold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Tonyx
            </Link>

            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
              {footerLinks.map(({ title, href }) => (
                <li key={title}>
                  <Link
                    href={href}
                    className="rounded-md text-muted-foreground transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col-reverse items-center justify-between gap-4 py-6 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Tonyx. Built on TON.
            </p>

            <div className="flex items-center gap-1">
              {footerSocials.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
