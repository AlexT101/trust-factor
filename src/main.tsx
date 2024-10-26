import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from "./components/theme-provider";

import { IconLicense, IconLock } from '@tabler/icons-react';
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Define the structure of the link data with proper TypeScript interface
interface LinkData {
  href: string;
  text: string;
  type: 'policy' | 'terms'; // Making the type more specific with literal types
  pageTitle?: string;
}

// Define message types for better type safety
interface ContentScriptMessage {
  action: 'sendLinks';
  links: LinkData[];
}

interface InjectionResponse {
  status: 'success' | 'failure';
  error?: string;
}

interface ScoreData {
  quotes: string[];
  score: number;
}

interface Results {
  scores: Record<string, ScoreData>;
}

const ScoreAccordion: React.FC<{ results: Results }> = ({ results }) => {
  return (
    <div className="w-full">
      {Object.keys(results.scores).map((category) => {
        const { quotes, score } = results.scores[category];

        return (
          <div key={category} className="w-full mb-4">
            {/* Progress Bar (Always Visible) */}
            <div className="w-full mb-2">
              <div className="w-full flex justify-between items-center">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={category}>
                    <AccordionTrigger className="w-full text-left">
                      <span className="font-semibold">{category}: {score}/5</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="w-full border-l-4 border-zinc-700 pl-3 pb-1">
                        <p className="text-zinc-300 mb-4 w-full underline underline-offset-4">Key References</p>
                        <ul className="text-zinc-400">
                          {quotes.map((quote, index) => (
                            <li key={index} className={index !== quotes.length - 1 ? "mb-4" : ""}>
                              "{quote}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <Progress value={(score / 5) * 100} className="w-full" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

function calculateTotalScore(results: Results): number {
  const scores = Object.values(results.scores);
  const totalScores = scores.reduce((sum, scoreData) => sum + scoreData.score, 0);
  const maxPossibleScore = scores.length * 5;
  const percentageScore = (totalScores / maxPossibleScore) * 100;

  return Math.round(percentageScore);
}


interface Metadata {
  risk_percentage: number;
  risk_level: string;
}

interface ApiResponse {
  scores: Results;
  metadata: Metadata;
}

const Sidebar: React.FC = () => {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results] = useState<Results>({
    scores: {
      account_control: {
        quotes: ["exact quote 1", "exact quote 2"],
        score: 3,  // Example score
      },
      data_collection: {
        quotes: ["exact quote 1", "exact quote 2"],
        score: 2,  // Example score
      },
      privacy_info: {
        quotes: ["exact quote 1", "exact quote 2"],
        score: 4,  // Example score
      },
      account_testing: {  // This could be any other unknown key
        quotes: ["exact quote 1", "exact quote 2"],
        score: 5,  // Example score
      },
      // More unknown keys can be added here
    }
  });

  //function to fetch analysis
  // Add function to fetch analysis
  const fetchAnalysis = async (url: string): Promise<ApiResponse> => {
    try {
      const response = await fetch('YOUR_API_ENDPOINT_HERE', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Analysis fetch error:', error);
      throw error;
    }
  };

  // Message listener setup with proper cleanup
  useEffect(() => {
    const messageListener = async (
      message: ContentScriptMessage,
      _: chrome.runtime.MessageSender,
      sendResponse: (response: { farewell: string }) => void
    ) => {
      if (message.action === 'sendLinks') {
        // Fetch analysis for each link
        const linksWithAnalysis = await Promise.all(
          message.links.map(async (link) => {
            try {
              const analysis = await fetchAnalysis(link.href);
              return { ...link, analysis };
            } catch (error) {
              console.error(`Failed to fetch analysis for ${link.href}:`, error);
              return link;
            }
          })
        );
        setLinks(linksWithAnalysis);
        setError(null);
      }
      sendResponse({ farewell: "goodbye" });
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Inject script handler with proper error handling
  const injectScript = useCallback(async () => {
    setIsInjecting(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage<
        { action: 'injectContentScript' },
        InjectionResponse
      >({ action: 'injectContentScript' });

      if (response?.status === 'success') {
        console.log('Content script injected successfully');
      } else {
        throw new Error(response?.error || 'Failed to inject content script');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Injection error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsInjecting(false);
    }
  }, []);

  // Helper function to get link text
  const getLinkText = (type: LinkData['type']) => {
    return type === 'policy' ? 'Privacy Policy' : 'Terms and Conditions';
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="p-6 bg-gradient-to-b from-zinc-800 to-zinc-900 w-full h-full overflow-x-hidden overflow-y-scroll flex flex-col items-center">
        {/* Header Section */}
        <div className="mb-8 w-full">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 text-center w-full">
            TrustFactor
          </h1>
          <p className="text-zinc-400 text-sm w-full text-center">
            Analyze Terms and Privacy Policies
          </p>
        </div>

        {/* Scan Button */}
        <button
          onClick={injectScript}
          disabled={isInjecting}
          className={`
          w-full px-4 py-3 rounded-lg font-medium
          transition-all duration-200 transform hover:scale-[1.02]
          bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/20
        `}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-zinc-50 font-bold text-xl">Scan Terms and Policies</span>
          </div>
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {links.length > 0 ? (
          <>

            <div className="w-full m-2 p-6 rounded-2xl bg-zinc-800 mt-8 outline outline-1 outline-zinc-700 shadow-zinc-800 shadow-md">

              <h2 className="font-medium text-5xl text-center text-zinc-500">
                <span className={`
                  font-extrabold text-6xl ${calculateTotalScore(results) <= 40 ? "text-red-500" : calculateTotalScore(results) <= 80 ? "text-blue-600" : "text-purple-500"}`}>
                  {calculateTotalScore(results)}
                </span>/100
              </h2>
              <p className="mt-3 text-zinc-500 text-sm font-medium w-full text-center">TRUST FACTOR SCORE</p>
            </div>

            <div className="mt-6 w-full">
              <h2 className="text-zinc-400 text-lg font-medium mb-3 w-full text-center">
                Breakdown
              </h2>
              <ScoreAccordion results={results} />
            </div>


            {/* Results Section */}
            <div className="mt-6">
              <h2 className="text-zinc-400 text-lg font-medium mb-3 w-full text-center">
                Sources Referenced
              </h2>

              <div className="space-y-3">
                {links.map((link, index) => (
                  <a
                    key={`${link.href}-${index}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 
                        transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`
                  p-2 rounded-md
                  ${link.type === 'policy'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'}
                `}>
                        {link.type === 'policy' ? <IconLock /> : <IconLicense />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${link.type === 'policy' ? 'group-hover:text-blue-400' : 'group-hover:text-purple-400'}  transition-colors`}>
                          {link.pageTitle || getLinkText(link.type)}
                        </div>
                        <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                          {link.href}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </>
        ) : (
          <h2 className="text-zinc-400 text-md font-medium mb-3 w-full text-center mt-8">
            No Content Scanned
          </h2>
        )}
      </div>
    </ThemeProvider>
  );
};


// Mount the Sidebar component with error boundary
const mountSidebar = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Sidebar />
    </React.StrictMode>
  );
};

// Handle mounting errors
try {
  mountSidebar();
} catch (error) {
  console.error('Failed to mount Sidebar:', error);
}

export default Sidebar;