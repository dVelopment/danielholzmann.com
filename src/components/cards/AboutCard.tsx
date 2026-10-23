import * as React from "react";
import { StaticImage } from "gatsby-plugin-image";
import siteConfig from "../../data/siteConfig";

const AboutCard: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Header with avatar */}
      <div className="flex items-start gap-4 mb-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-steel group-hover:border-matrix transition-colors">
            <StaticImage
              src="../../images/avatar.jpg"
              alt={siteConfig.authorName}
              placeholder="blurred"
              layout="constrained"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Online indicator */}
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-matrix rounded-full border-2 border-terminal animate-pulse-glow" />
        </div>

        {/* Name and title */}
        <div className="flex-1 min-w-0">
          <h2 className="font-mono text-lg md:text-xl font-bold text-white mb-1">
            <span className="text-matrix">&gt;</span> {siteConfig.authorName}
          </h2>
          <p className="font-mono text-sm text-ghost">
            Full-Stack Developer &amp; AI Engineer
          </p>
          <p className="font-mono text-xs text-steel mt-1">
            // available for work
          </p>
        </div>
      </div>

      {/* Bio */}
      <div
        className="text-sm text-ghost leading-relaxed flex-1"
        dangerouslySetInnerHTML={{ __html: siteConfig.authorDescription }}
      />

      {/* Decorative footer */}
      <div className="mt-4 pt-4 border-t border-steel">
        <p className="font-mono text-xs">
          <span className="text-ghost">location:</span>{" "}
          <span className="text-white">Austria</span>{" "}
          <span className="text-matrix">|</span>{" "}
          <span className="text-ghost">exp:</span>{" "}
          <span className="text-white">20+ years</span>
        </p>
      </div>
    </div>
  );
};

export default AboutCard;
