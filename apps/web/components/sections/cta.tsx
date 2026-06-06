'use client';

import { useRef } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CTA = () => {
  const ref = useRef(null);

  const bottomAnimation = {
    initial: { y: '5%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1, delay: 0.2 },
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
      <div
        ref={ref}
        className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-3xl border border-white/10 px-6 before:absolute before:-z-10 before:top-24 before:h-4/5 before:w-full before:rounded-full before:bg-gradient-to-r before:from-white/10 before:from-20% before:via-white/[0.02] before:via-55% before:to-white/10 before:to-80% before:blur-3xl"
      >
        <motion.div
          {...bottomAnimation}
          className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-16 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Start earning yield today
            </h2>
            <p className="text-lg text-muted-foreground">
              Connect your wallet, set a policy in two minutes, and let Tonyx
              scan, reason, and rebalance so your funds never sit idle.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard">
              Launch app
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
