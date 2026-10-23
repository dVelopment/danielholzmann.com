import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";

import Layout from "../components/layout/Layout";
import SEO from "../components/seo/SEO";
import Hero from "../components/hero/Hero";
import BentoGrid from "../components/bento/BentoGrid";
import BentoCard from "../components/bento/BentoCard";
import AboutCard from "../components/cards/AboutCard";
import SkillsRadar from "../components/cards/SkillsRadar";
import TimelineCard from "../components/cards/TimelineCard";
import ReposCard from "../components/cards/ReposCard";
import SocialCard from "../components/cards/SocialCard";

const IndexPage: React.FC<PageProps> = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <Hero />

      {/* Bento Grid Section */}
      <BentoGrid>
        {/* Row 1: About (large) + Skills (wide) */}
        <BentoCard size="large" delay={0}>
          <AboutCard />
        </BentoCard>

        <BentoCard size="wide" delay={1}>
          <SkillsRadar />
        </BentoCard>

        {/* Row 2: Timeline (wide) + Repos + Social */}
        <BentoCard size="wide" delay={2}>
          <TimelineCard />
        </BentoCard>

        <BentoCard delay={3}>
          <ReposCard />
        </BentoCard>

        <BentoCard delay={4}>
          <SocialCard />
        </BentoCard>
      </BentoGrid>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 md:px-6 py-8 border-t border-steel">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-mono text-xs text-ghost">
            <span>daniel@portfolio</span>
            <span className="text-matrix">:</span>
            <span className="text-cyber">~</span>
            <span>$</span>
            <span className="ml-2 text-white">© {new Date().getFullYear()}</span>
          </div>
          <div className="font-mono text-xs text-ghost flex items-center gap-4">
            <span>Node v24</span>
            <span className="text-steel">|</span>
            <span>React 18</span>
            <span className="text-steel">|</span>
            <span>Gatsby 5</span>
          </div>
        </div>
      </footer>
    </Layout>
  );
};

export default IndexPage;

export const Head: HeadFC = () => (
  <SEO
    title="Full-Stack Developer & AI Engineer"
    description="Portfolio of Daniel Holzmann, a full-stack developer and AI engineer building production-grade AI agents and agentic workflows on 20+ years of software engineering experience."
  />
);
