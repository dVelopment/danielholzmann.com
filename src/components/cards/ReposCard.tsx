import * as React from "react";
import { useStaticQuery, graphql } from "gatsby";
import { motion, useInView } from "motion/react";

interface Repository {
  id: string;
  name: string;
  url: string;
  description: string | null;
  stargazerCount: number;
  primaryLanguage?: {
    name: string;
    color: string;
  };
}

const ReposCard: React.FC = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Query GitHub repos - will fail gracefully if no GITHUB_TOKEN
  let repos: Repository[] = [];

  try {
    const data = useStaticQuery(graphql`
      query GitHubRepos {
        github {
          viewer {
            pinnedItems(first: 3, types: [REPOSITORY]) {
              edges {
                node {
                  ... on GitHub_Repository {
                    id
                    name
                    url
                    description
                    stargazerCount
                    primaryLanguage {
                      name
                      color
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    repos =
      data?.github?.viewer?.pinnedItems?.edges?.map(
        (edge: { node: Repository }) => edge.node
      ) ?? [];
  } catch {
    // If GitHub API fails, show placeholder
    repos = [];
  }

  return (
    <div ref={ref} className="flex flex-col h-full">
      {/* Header */}
      <h3 className="font-mono text-sm text-ghost mb-4">
        <span className="text-matrix">//</span> github.pinned
      </h3>

      {/* Repos list */}
      <div className="flex-1 space-y-3">
        {repos.length > 0 ? (
          repos.map((repo, index) => (
            <motion.a
              key={repo.id}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-smoke/50 border border-steel/50 hover:border-matrix/50 hover:bg-smoke transition-all group"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-mono text-sm text-white group-hover:text-matrix transition-colors truncate">
                    {repo.name}
                  </h4>
                  {repo.description && (
                    <p className="text-xs text-ghost mt-1 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-ghost flex-shrink-0">
                  <span className="text-signal">★</span>
                  {repo.stargazerCount}
                </div>
              </div>
              {repo.primaryLanguage && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: repo.primaryLanguage.color }}
                  />
                  <span className="font-mono text-xs text-steel">
                    {repo.primaryLanguage.name}
                  </span>
                </div>
              )}
            </motion.a>
          ))
        ) : (
          <div className="text-center py-6">
            <p className="font-mono text-sm text-steel">
              // loading repos...
            </p>
          </div>
        )}
      </div>

      {/* Link to GitHub */}
      <a
        href="https://github.com/dVelopment"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 font-mono text-xs text-ghost hover:text-matrix transition-colors"
      >
        → view all on GitHub
      </a>
    </div>
  );
};

export default ReposCard;
