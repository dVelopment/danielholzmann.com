import * as React from "react";
import { motion } from "motion/react";
import siteConfig from "../../data/siteConfig";

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-void overflow-hidden">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-steel) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-steel) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Terminal prompt prefix */}
          <p className="font-mono text-ghost text-sm md:text-base mb-4 tracking-wider">
            // welcome to my portfolio
          </p>

          {/* Main title */}
          <h1 className="font-mono text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            <span className="text-matrix">&gt; </span>
            {siteConfig.authorName}
            <span className="animate-blink text-matrix">_</span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-mono text-lg md:text-xl text-ghost"
          >
            Full-Stack Developer &amp; AI Engineer
          </motion.p>

          {/* Code-style tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8 font-mono text-sm text-steel"
          >
            <span className="text-ghost">const</span>{" "}
            <span className="text-cyber">passion</span>{" "}
            <span className="text-ghost">=</span>{" "}
            <span className="text-matrix">"Shipping AI agents to production"</span>
            <span className="text-ghost">;</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-xs text-ghost">scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 border-2 border-steel rounded-full flex justify-center pt-1"
          >
            <div className="w-1 h-2 bg-matrix rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
