'use client';

import { useRef } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CTA = () => {
  const ref = useRef(null);

  const bottomAnimation = {
    initial: { y: '5%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1, delay: 0.2 },
  };

  return (
    <section>
      <div className="py-8 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-16">
          <div
            ref={ref}
            className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-3xl border border-white/10 px-6 before:absolute before:-z-10 before:top-24 before:h-4/5 before:w-full before:rounded-full before:bg-gradient-to-r before:from-white/10 before:from-20% before:via-white/[0.02] before:via-55% before:to-white/10 before:to-80% before:blur-3xl"
          >
            <motion.div
              {...bottomAnimation}
              className="mx-auto flex flex-col items-center gap-6"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <h2 className="text-3xl font-medium md:text-5xl">
                  Start earning yield today
                </h2>
                <p className="mx-auto max-w-2xl text-muted-foreground">
                  Connect your wallet, set a policy in two minutes, and let Tonyx
                  scan, reason, and rebalance so your funds never sit idle.
                </p>
              </div>
              <Link href="/dashboard">
                <Button className="group relative h-12 w-fit overflow-hidden rounded-full p-1 pe-14 ps-6 text-sm font-medium transition-all duration-500 hover:bg-white/90 hover:pe-6 hover:ps-14">
                  <span className="relative z-10 transition-all duration-500">
                    Launch app
                  </span>
                  <div className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                    <ArrowUpRight size={16} />
                  </div>
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
