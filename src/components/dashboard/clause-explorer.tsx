
'use client';

import React, { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  Scale,
  FileX,
  Globe,
  Swords,
  Copyright,
  Handshake,
  Columns,
  Search,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Share2,
  Copy,
  CheckCircle2,
  Mail,
  MessageCircle,
  Link2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { defineLegalTerm } from '@/ai/flows/define-legal-term';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';

type Clause = {
  icon: React.ReactNode;
  title: string;
  alias?: string;
  simpleExplanation: string;
  standardWording: string;
  implicationsAndRisks: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  whyItMatters: { title: string; text: string; icon: React.ReactNode }[];
  relatedClauses?: string[];
};

const commonClauses: Clause[] = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Indemnification',
    alias: 'Hold Harmless, Save Harmless',
    simpleExplanation:
      "Think of this as an insurance policy written into the contract. It promises that one party will cover the financial losses, legal fees, or damages of the other party if specific things go wrong (like a lawsuit from a third party).",
    standardWording:
      'The "Indemnifying Party" shall indemnify, defend, and hold harmless the "Indemnified Party" from and against any and all claims, losses, damages, liabilities, and expenses, including reasonable attorneys\' fees, arising out of or related to the Indemnifying Party\'s breach of this Agreement.',
    implicationsAndRisks:
      "This is a major risk-shifting clause. If you are the indemnifying party, you could be responsible for significant costs. Pay close attention to the scope: what events trigger indemnification? Is it limited to third-party claims?",
    riskLevel: 'High',
    whyItMatters: [
      {
        title: 'Protection against 3rd parties',
        text: 'Crucial if the other party\'s actions could get you sued by someone else.',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      },
      {
        title: 'Uncapped Liability',
        text: 'Indemnity claims often fall outside "Limitation of Liability" caps, meaning financial exposure can be unlimited.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      },
    ],
    relatedClauses: ['Limitation of Liability'],
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: 'Limitation of Liability',
    alias: 'Liability Cap',
    simpleExplanation:
      'This clause sets a cap on the amount of money one party has to pay the other if something goes wrong, often excluding "indirect" or "consequential" damages.',
    standardWording:
      'In no event shall either party\'s aggregate liability arising out of or related to this agreement exceed the total amount paid by you hereunder in the 12 months preceding the last event giving rise to liability. In no event shall either party be liable for any indirect, incidental, special, or consequential damages, including loss of profits, data, or business opportunities.',
    implicationsAndRisks:
      "Crucial for financial risk management. A low cap benefits the party providing the service/product. A high cap or no cap is better for the paying party. The exclusion of 'consequential damages' is standard but can leave you without compensation for business losses.",
    riskLevel: 'High',
    whyItMatters: [
         {
        title: 'Financial Safety Net',
        text: 'This clause directly limits the maximum financial exposure your business faces under the contract.',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      },
      {
        title: 'Excludes Certain Damages',
        text: 'Pay attention to what is excluded, such as lost profits. This can be more significant than the direct liability cap.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      },
    ],
    relatedClauses: ['Indemnification'],
  },
  {
    icon: <FileX className="h-5 w-5" />,
    title: 'Termination',
    alias: 'Termination for Convenience, For Cause',
    simpleExplanation:
      'Defines how and when the contract can be ended, either for any reason (with notice) or for a serious violation (a "material breach").',
    standardWording:
      'Either party may terminate this Agreement for any reason upon thirty (30) days prior written notice to the other party. This Agreement may be terminated immediately by either party for a material breach by the other party if such breach is not cured within fifteen (15) days of receiving written notice.',
    implicationsAndRisks:
      'Termination for convenience gives flexibility but can create instability. A short "cure period" for breaches gives less time to fix problems. Ensure the conditions for termination are clear and fair for both sides.',
    riskLevel: 'Medium',
     whyItMatters: [
         {
        title: 'Exit Strategy',
        text: 'This defines your ability to exit the relationship. A "for convenience" clause offers the most flexibility.',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      },
      {
        title: 'Cure Period',
        text: 'A short cure period (e.g., 5 days) means you have very little time to fix a mistake before the other party can terminate.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      },
    ],
    relatedClauses: [],
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: 'Governing Law & Jurisdiction',
    alias: 'Venue, Choice of Law',
    simpleExplanation:
      "Specifies which state's or country's laws will be used to interpret the contract and where any lawsuit must be filed.",
    standardWording:
      'This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. The parties consent to the exclusive jurisdiction of the state and federal courts located in Wilmington, Delaware.',
    implicationsAndRisks:
      "This has huge practical implications. If the specified jurisdiction is far from you, litigation can become prohibitively expensive and inconvenient. Always check if it's a favorable or neutral location.",
    riskLevel: 'Medium',
     whyItMatters: [
        {
        title: 'Home-Field Advantage',
        text: 'Having your local state as the governing law and jurisdiction is a significant strategic advantage in a dispute.',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      },
       {
        title: 'Cost of Litigation',
        text: 'If the jurisdiction is across the country, you may need to hire local lawyers and travel, dramatically increasing costs.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      },
    ],
    relatedClauses: [],
  },
  {
    icon: <Swords className="h-5 w-5" />,
    title: 'Force Majeure',
    alias: 'Act of God',
    simpleExplanation:
      'Excuses a party from not performing their contractual duties due to unforeseen, external events beyond their control, like natural disasters or war.',
    standardWording:
      'Neither party shall be liable for any failure to perform its obligations hereunder where such failure results from any cause beyond its reasonable control, including, without limitation, acts of God, war, terrorism, riots, or natural disasters.',
    implicationsAndRisks:
      'This clause is often overlooked until it\'s too late. The list of events should be reviewed. For example, does it include "pandemics" or "cyberattacks"? A broad definition can excuse non-performance too easily.',
    riskLevel: 'Low',
    whyItMatters: [
        {
        title: 'Business Continuity',
        text: 'This clause protects you from being in breach of contract due to catastrophic events you cannot control.',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      },
    ],
    relatedClauses: [],
  },
  {
    icon: <Copyright className="h-5 w-5" />,
    title: 'Intellectual Property',
    alias: 'IP Rights',
    simpleExplanation:
      "Clarifies who owns the creative work (code, designs, branding) generated or used during the contract and how the other party can use it.",
    standardWording:
      'All intellectual property rights in and to the services provided, including any deliverables, shall remain the exclusive property of the Provider. The Client is granted a limited, non-exclusive, non-transferable license to use the deliverables for its internal business purposes only.',
    implicationsAndRisks:
      'Critical for any creative or tech project. If you are paying for work, you need to ensure you own it or have a broad enough license to use it as needed. Look for terms like "work-for-hire" or "assignment of IP".',
    riskLevel: 'High',
    whyItMatters: [
         {
        title: 'Ownership is Key',
        text: 'If you are paying for custom work, you should typically own the resulting intellectual property. Check for "work for hire" or "assignment".',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      },
       {
        title: 'Pre-existing IP',
        text: 'The other party will usually retain ownership of their pre-existing tools and IP. Ensure you have a perpetual license to use anything that is part of the final deliverable.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      },
    ],
    relatedClauses: [],
  },
];

type ClauseDetail = Clause | { title: string; alias?: string; simpleExplanation: string; standardWording: string; implicationsAndRisks: string; riskLevel: 'Low' | 'Medium' | 'High'; icon: React.ReactNode; whyItMatters: { title: string; text: string; icon: React.ReactNode }[]; relatedClauses?: string[] };

const ClauseExplorer = () => {
  const [selectedClause, setSelectedClause] = useState<ClauseDetail>(
    commonClauses[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    startTransition(async () => {
      try {
        const result = await defineLegalTerm({ term: searchTerm });
        setSelectedClause({
          title: result.term,
          alias: undefined,
          simpleExplanation: result.simpleExplanation,
          standardWording: result.standardWording,
          implicationsAndRisks: result.implicationsAndRisks,
          riskLevel: result.riskLevel,
          icon: <Search className="h-5 w-5 text-accent" />,
          whyItMatters: [{
              title: "Key Implications",
              text: result.implicationsAndRisks,
              icon: <AlertTriangle className="h-5 w-5 text-yellow-500"/>
          }],
          relatedClauses: [],
        });
      } catch (error) {
        console.error('Failed to define legal term:', error);
        toast({
          variant: 'destructive',
          title: 'Search Failed',
          description:
            'Could not retrieve a definition for that term. Please try again.',
        });
      }
    });
  };

  const handleRelatedClauseClick = (title: string) => {
    const clause = commonClauses.find(c => c.title === title);
    if (clause) {
      setSelectedClause(clause);
    }
  }

  const handleCopy = (text: string, type: 'clause' | 'explanation') => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to Clipboard',
        description: `The ${type} has been copied.`,
      })
    }).catch(err => {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy the text.',
      })
    });
  };

  const handleShare = (platform: 'email' | 'copy') => {
    const shareText = `Clause: ${selectedClause.title}\n\nSimple Explanation:\n${selectedClause.simpleExplanation}`;

    switch (platform) {
      case 'email':
        window.location.href = `mailto:?subject=Legal Decoder: Understanding "${selectedClause.title}"&body=${encodeURIComponent(shareText)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareText).then(() => {
          toast({ title: 'Share Text Copied', description: 'Clause details copied to clipboard.' });
        }, () => {
          toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy the text.' });
        });
        break;
    }
  };


  const riskLevelToVariant = (
    level: 'High' | 'Medium' | 'Low'
  ): 'high' | 'medium' | 'low' => {
    return level.toLowerCase() as 'high' | 'medium' | 'low';
  };

  const riskLevelToPercent = {
    Low: 25,
    Medium: 50,
    High: 85,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Left Panel */}
      <Card className="lg:col-span-4 glass-card flex flex-col">
        <CardHeader>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search a legal term..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-2 overflow-hidden">
          <ScrollArea className="flex-grow pr-2">
            <div className="space-y-2">
              {commonClauses.map((clause) => (
                <Button
                  key={clause.title}
                  variant="ghost"
                  onClick={() => setSelectedClause(clause)}
                  className={cn(
                    'w-full justify-start p-3 h-auto text-left flex items-center gap-3',
                    selectedClause.title === clause.title && 'bg-primary/10 text-primary'
                  )}
                >
                  <div className="p-2 bg-slate-800/50 rounded-md">{clause.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{clause.title}</p>
                  </div>
                  <Badge variant={riskLevelToVariant(clause.riskLevel)}>{clause.riskLevel}</Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel */}
      <motion.div
        key={selectedClause.title}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:col-span-8"
      >
        {isSearching ? (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-heading flex items-center gap-3">
                  {selectedClause.title}
                   <Badge variant="outline" className="text-sm bg-accent/10 border-accent/50 text-accent">+ AI Simplified</Badge>
                </h2>
                {selectedClause.alias && <p className="mt-2 text-md text-muted-foreground">Also known as: {selectedClause.alias}</p>}
              </div>
               <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4"/>Share</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleShare('email')}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShare('copy')}><Copy className="mr-2 h-4 w-4" /> Copy Share Text</DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" onClick={() => handleCopy(selectedClause.standardWording, 'clause')}><Copy className="mr-2 h-4 w-4"/>Copy Clause</Button>
              </div>
            </div>

            <Separator />
            
             {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 space-y-6">
                    {/* In Plain English */}
                    <Card className="bg-transparent border-0 shadow-none">
                        <CardHeader className="flex-row items-center gap-3 p-0">
                            <div className="p-3 bg-blue-500/10 rounded-full"><Lightbulb className="h-5 w-5 text-blue-400" /></div>
                            <CardTitle className="text-lg text-foreground">In Plain English</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 pt-4">
                            <p className="text-base text-muted-foreground leading-relaxed">{selectedClause.simpleExplanation}</p>
                        </CardContent>
                    </Card>

                     {/* Typical Structure */}
                     <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-md">Typical Structure</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">
                            {selectedClause.standardWording}
                            </blockquote>
                            <Button variant="link" className="px-0 mt-4">Read full wording →</Button>
                        </CardContent>
                     </Card>

                    {/* Why it matters */}
                     <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-md">Why It Matters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedClause.whyItMatters?.map(item => (
                                <div key={item.title} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">{item.icon}</div>
                                    <div>
                                        <p className="font-semibold text-foreground">{item.title}</p>
                                        <p className="text-sm text-muted-foreground">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                     </Card>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                     {/* Risk Level */}
                    <Card className="glass-card">
                        <CardHeader className="flex-row justify-between items-center">
                            <CardTitle className="text-md">Risk Level</CardTitle>
                            <Badge variant={riskLevelToVariant(selectedClause.riskLevel)}>{selectedClause.riskLevel}</Badge>
                        </CardHeader>
                        <CardContent>
                             <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2">
                                <div 
                                    className={cn("h-2.5 rounded-full", {
                                        'bg-green-500': selectedClause.riskLevel === 'Low',
                                        'bg-yellow-500': selectedClause.riskLevel === 'Medium',
                                        'bg-red-500': selectedClause.riskLevel === 'High',
                                    })} 
                                    style={{ width: `${riskLevelToPercent[selectedClause.riskLevel]}%` }}>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {selectedClause.riskLevel === 'High' && 'Highly negotiated. Requires careful review.'}
                                {selectedClause.riskLevel === 'Medium' && 'Commonly found, but review scope carefully.'}
                                {selectedClause.riskLevel === 'Low' && 'Standard clause, generally low impact.'}
                            </p>
                        </CardContent>
                    </Card>
                    
                    {/* Related Clauses */}
                    {(selectedClause.relatedClauses && selectedClause.relatedClauses.length > 0) && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-md">Related Clauses</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {selectedClause.relatedClauses.map(title => (
                                     <Button key={title} variant="ghost" className="w-full justify-between" onClick={() => handleRelatedClauseClick(title)}>
                                        {title} →
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClauseExplorer;

    