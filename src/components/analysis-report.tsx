
'use client';

import { Clause } from '@/lib/types';
import { useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  FileSearch,
  Share2,
  Download,
  RotateCcw,
  MessageCircle,
  Mail,
  Link2,
  Languages,
  Loader2,
  Bot,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getOverallRisk } from '@/lib/utils';


type AnalysisReportProps = {
  analysisResult: Clause[];
  contractName: string;
  onStartNew: () => void;
  analysisId: string | null;
  onLanguageChange: (lang: 'en' | 'hi' | 'te' | 'ta') => void;
  currentLanguage: 'en' | 'hi' | 'te' | 'ta';
  isTranslating: boolean;
  onStartNegotiation?: () => void;
};

const riskLevelToVariant = (
  level: 'High' | 'Medium' | 'Low'
): 'high' | 'medium' | 'low' => {
  return level.toLowerCase() as 'high' | 'medium' | 'low';
};

const LanguageDisplay: Record<'en' | 'hi' | 'te' | 'ta', string> = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil',
};

export default function AnalysisReport({
  analysisResult,
  contractName,
  onStartNew,
  analysisId,
  onLanguageChange,
  currentLanguage,
  isTranslating,
  onStartNegotiation,
}: AnalysisReportProps) {
  const { toast } = useToast();
  
  const { summaryCards, overallRisk, riskScore } = useMemo(() => {
    const risk = getOverallRisk(analysisResult);
    let score = 90;
    if (risk === 'High') score = 30;
    else if (risk === 'Medium') score = 65;

    const highRiskCount = analysisResult.filter(
      (c) => c.riskLevel === 'High'
    ).length;
    const mediumRiskCount = analysisResult.filter(
      (c) => c.riskLevel === 'Medium'
    ).length;
    const lowRiskCount = analysisResult.filter(
      (c) => c.riskLevel === 'Low'
    ).length;

    return {
      summaryCards: [
        {
          title: 'Total Clauses',
          value: analysisResult.length,
          icon: <FileText className="text-blue-400" />,
          footer: 'Processed',
        },
        {
          title: 'Critical Risks',
          value: highRiskCount,
          icon: <AlertTriangle className="text-red-400" />,
          footer: 'Immediate attention needed',
        },
        {
          title: 'Moderate Risks',
          value: mediumRiskCount,
          icon: <AlertCircle className="text-yellow-400" />,
          footer: 'Standard review advised',
        },
        {
          title: 'Low Risks',
          value: lowRiskCount,
          icon: <FileSearch className="text-green-400" />,
          footer: 'All clear',
        },
      ],
      overallRisk: risk,
      riskScore: score,
    };
  }, [analysisResult]);

  const getRiskColor = () => {
    if (overallRisk === 'High') return 'text-red-400';
    if (overallRisk === 'Medium') return 'text-yellow-400';
    return 'text-green-400';
  };

  const handleExport = () => {
    if (analysisId) {
      window.open(`/report/${analysisId}`, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not generate report link, analysis ID is missing.',
      });
    }
  };
  
  const getShareLink = () => `${window.location.origin}/report/${analysisId}`;

  const handleShare = (platform: 'email' | 'whatsapp' | 'copy') => {
    if (!analysisId) {
       toast({
        variant: 'destructive',
        title: 'Sharing Failed',
        description: 'Cannot generate a shareable link, analysis ID is missing.',
      });
      return;
    }
    const link = getShareLink();
    const shareText = `Check out this contract analysis for "${contractName}": ${link}`;

    switch (platform) {
      case 'email':
        window.location.href = `mailto:?subject=Contract Analysis: ${contractName}&body=${shareText}`;
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(link).then(() => {
          toast({ title: 'Link Copied', description: 'Shareable link copied to clipboard.' });
        }, () => {
          toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy link to clipboard.' });
        });
        break;
    }
  };

  const canStartNegotiation = (overallRisk === 'Medium' || overallRisk === 'High');


  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            {contractName} Analysis
            <Badge variant="secondary" className="bg-green-500/10 text-green-400">
              COMPLETED
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyzed {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Languages className="mr-2 h-4 w-4" />}
                {LanguageDisplay[currentLanguage]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(LanguageDisplay) as Array<keyof typeof LanguageDisplay>).map(lang => (
                 <DropdownMenuItem key={lang} onSelect={() => onLanguageChange(lang)} disabled={isTranslating}>
                   {LanguageDisplay[lang]}
                 </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={onStartNew}><RotateCcw className="mr-2 h-4 w-4" /> New Analysis</Button>
          
          {/* Negotiation feature temporarily disabled */}
          {/* {onStartNegotiation && (
            <Button 
                onClick={onStartNegotiation} 
                disabled={!canStartNegotiation} 
                className="bg-accent hover:bg-accent/90"
                title={!canStartNegotiation ? "Negotiation agent is recommended for Medium or High risk contracts." : "Start AI Negotiation"}
            >
                <Bot className="mr-2 h-4 w-4" /> Start Negotiation
            </Button>
          )} */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleShare('email')}><Mail className="mr-2 h-4 w-4"/> Email</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}><MessageCircle className="mr-2 h-4 w-4"/> WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}><Link2 className="mr-2 h-4 w-4"/> Copy Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export Report</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {summaryCards.map((card) => (
          <Card key={card.title} className="glass-card">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.footer}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Risk Assessment */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <div className="relative h-48 w-48">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="stroke-current text-border"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="2"
                  />
                  <path
                    className={`stroke-current ${getRiskColor()}`}
                    strokeDasharray={`${riskScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">{riskScore}</span>
                  <span className="text-sm text-muted-foreground">SCORE</span>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground">
                This document has a{' '}
                <span className={`font-semibold ${getRiskColor()}`}>
                  {overallRisk} Risk
                </span>{' '}
                profile. Review critical clauses before signing.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Key Clause Breakdown */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Key Clause Breakdown</CardTitle>
                <Button variant="link" className="text-primary">Filter by: High Risk First</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {analysisResult.map((clause, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="bg-secondary/30 rounded-lg border border-border">
                    <AccordionTrigger className="p-4 hover:no-underline text-left">
                       <div className="flex items-center gap-4 w-full">
                        <span className="font-semibold text-lg text-white">
                           {index + 1}. {clause.clauseType}
                        </span>
                        <Badge variant={riskLevelToVariant(clause.riskLevel)} className="ml-auto">
                          {clause.riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-4">
                        <div>
                          <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Original Legal Text</h4>
                          <p className="text-sm text-gray-300 leading-relaxed font-mono">{clause.clauseText}</p>
                        </div>
                         <div>
                           <h4 className="text-xs uppercase font-semibold text-primary mb-2">✦ AI Simplification</h4>
                           <p className="text-sm text-white leading-relaxed">{clause.summary}</p>
                           <p className="text-xs text-muted-foreground mt-4">{clause.riskReason}</p>
                           {(clause.riskLevel === 'High' || clause.riskLevel === 'Medium') && (
                            <Link href="/clause-explorer" className="text-xs text-primary hover:underline mt-2 block">Why is this critical?</Link>
                           )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    
