
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Clause } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, Bot, ShieldAlert } from 'lucide-react';
import { Header } from '@/components/header';
import AuthGuard from '@/components/AuthGuard';
import { User } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import AnalysisReport from '@/components/analysis-report';
import { getTranslatedAnalysis } from '@/app/actions';
import { type TranslateAnalysisOutput } from '@/ai/flows/translate-analysis-flow';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getOverallRisk } from '@/lib/utils';


pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

function AnalyzePageComponent({ user }: { user: User }) {
  const [analysisResult, setAnalysisResult] =
    useState<Clause[] | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [contractText, setContractText] = useState('');
  const [contractFileName, setContractFileName] = useState('New Contract');

  // Translation State
  const [translatedAnalysis, setTranslatedAnalysis] = useState<TranslateAnalysisOutput[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'te' | 'ta'>('en');

  // Negotiation State
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [isNegotiationApproved, setIsNegotiationApproved] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  const processedAnalysis = useMemo(() => {
    if (currentLang === 'en' || !translatedAnalysis || translatedAnalysis.length !== analysisResult?.length) {
      return analysisResult;
    }
    // Merge translation back into the main analysis object
    return analysisResult.map((clause, index) => ({
      ...clause,
      summary: translatedAnalysis[index].translatedSummary,
      riskReason: translatedAnalysis[index].translatedRiskReason,
      recommendation: translatedAnalysis[index].translatedRecommendation,
    }));
  }, [analysisResult, translatedAnalysis, currentLang]);
  
  const handleAnalyze = async (text: string, fileName: string) => {
    setContractText(text);
    setContractFileName(fileName);
    // Reset translation state on new analysis
    setCurrentLang('en');
    setTranslatedAnalysis(null);

    setIsLoading(true);
    setAnalysisResult(null);
    setAnalysisId(null);
    setExtractedEmails([]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          fileName: fileName,
          contractText: text,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      if (result.data) {
        setAnalysisResult(result.data.analysis_data as Clause[]);
        setAnalysisId(result.data.id);
        setExtractedEmails(result.data.extracted_emails || []);
        toast({
            title: "Analysis Complete",
            description: "Your contract report is ready below."
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error.message || 'An unknown error occurred.',
      });
      setAnalysisResult(null);
      setAnalysisId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisId(null);
    setContractText('');
    setContractFileName('New Contract');
    setIsLoading(false);
    setExtractedEmails([]);
    // Reset translation state
    setTranslatedAnalysis(null);
    setCurrentLang('en');
     toast({
        title: "Ready for New Analysis",
        description: "The previous report is saved in your dashboard history.",
    });
  }

  const handleLanguageChange = async (lang: 'en' | 'hi' | 'te' | 'ta') => {
    setCurrentLang(lang);
    if (lang === 'en' || !analysisResult) {
      setTranslatedAnalysis(null); // Clear translation if switching back to English
      return;
    }

    setIsTranslating(true);
    try {
      const clausesToTranslate = analysisResult.map(c => ({
        summary: c.summary,
        riskReason: c.riskReason,
        recommendation: c.recommendation,
      }));

      const response = await getTranslatedAnalysis(clausesToTranslate, lang);
      if (response.success && response.data) {
        setTranslatedAnalysis(response.data);
        toast({
          title: "Translation Complete",
          description: `Analysis is now displayed in ${lang}.`,
        });
      } else {
        throw new Error(response.error || 'Translation failed.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: 'Unable to translate at the moment. Showing English version.',
      });
      setCurrentLang('en'); // Revert to English on failure
      setTranslatedAnalysis(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleStartNegotiation = () => {
    if (processedAnalysis && analysisId) {
      const risk = getOverallRisk(processedAnalysis);
      if (risk === 'Medium' || risk === 'High') {
        setIsNegotiationModalOpen(true);
        setIsNegotiationApproved(false);
      } else {
        toast({
          title: 'Negotiation Not Needed',
          description: 'The negotiation agent is recommended for Medium or High risk contracts.',
        });
      }
    }
  };
  
  const confirmAndRunAgent = async () => {
    if (!analysisId || !processedAnalysis || !user) return;
  
    if (!isNegotiationApproved) {
      toast({
        variant: 'destructive',
        title: 'Approval Required',
        description: 'You must approve the action before proceeding.',
      });
      return;
    }
  
    setIsAgentRunning(true);
  
    const overallRisk = getOverallRisk(processedAnalysis);
    let score = 90;
    if (overallRisk === 'High') score = 30;
    else if (overallRisk === 'Medium') score = 65;

    const payload = {
        contractId: analysisId,
        userId: user.id,
        extractedEmails: extractedEmails || [],
        contractSummary: {
            overallRisk: overallRisk,
            score: score,
            summaryText: `This contract, "${contractFileName}", has an overall risk of ${overallRisk} with ${processedAnalysis.length} clauses analyzed.`,
            clauses: processedAnalysis.map(c => ({
                clauseTitle: c.clauseType,
                clauseText: c.clauseText,
                riskLevel: c.riskLevel
            }))
        }
    };
  
    try {
      console.log('🚨 Sending to agent:', payload);
      const response = await fetch('/api/supervity/negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json();
  
      if (!response.ok || result.error) {
        throw new Error(result.error || result.details || 'Agent execution failed');
      }
  
      toast({
        title: 'Negotiation Agent Started',
        description: 'The AI is processing the negotiation workflow. You will be notified upon completion.',
      });
  
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Agent Failed',
        description: err.message || 'Could not start the negotiation agent.',
      });
    } finally {
      setIsAgentRunning(false);
      setIsNegotiationModalOpen(false);
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-[#0B0C10] to-[#1A1A2E] text-white">
      <Header />
      <main className="flex-1 z-10 py-8 sm:py-12">
        {isLoading ? (
             <div className="container mx-auto max-w-4xl py-12 px-6 sm:px-8 md:px-4 flex items-center justify-center h-full">
                <div className="space-y-4 animate-in fade-in duration-500 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-lg text-muted-foreground">
                    AI is decoding your contract... this may take a moment.
                </p>
                </div>
            </div>
        ) : processedAnalysis ? (
            <div className="relative">
                <AnalysisReport
                    analysisResult={processedAnalysis}
                    contractName={contractFileName}
                    onStartNew={handleStartNewAnalysis}
                    analysisId={analysisId}
                    onLanguageChange={handleLanguageChange}
                    currentLanguage={currentLang}
                    isTranslating={isTranslating}
                    onStartNegotiation={handleStartNegotiation}
                />
            </div>
        ) : (
          <UploadSection onAnalyze={handleAnalyze} />
        )}
      </main>

       <AlertDialog open={isNegotiationModalOpen} onOpenChange={setIsNegotiationModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-accent"/>
                Confirm: Start Negotiation Assistant
            </AlertDialogTitle>
            <AlertDialogDescription>
              The AI agent will analyze the contract's risks and draft a negotiation email. This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
             <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-yellow-300">Potential Risks Detected</h4>
                        <p className="text-sm text-yellow-400/80">
                            This contract has a risk level of <span className="font-bold">{processedAnalysis ? getOverallRisk(processedAnalysis) : 'N/A'}</span>. The agent will focus on mitigating these points.
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox id="negotiation-approval-analyze" checked={isNegotiationApproved} onCheckedChange={(checked) => setIsNegotiationApproved(!!checked)} />
              <Label htmlFor="negotiation-approval-analyze" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I understand and approve running the negotiation agent.
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={confirmAndRunAgent}
                disabled={!isNegotiationApproved || isAgentRunning}
                className="bg-accent hover:bg-accent/90"
            >
              {isAgentRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Bot className="h-4 w-4 mr-2"/>}
              {isAgentRunning ? 'Running...' : 'Proceed with Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadSection({ onAnalyze }: { onAnalyze: (text: string, fileName: string) => void }) {
  const [isParsing, setIsParsing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    let extractedText = '';
    
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 0; i < pdf.numPages; i++) {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          extractedText += content.items.map((item: any) => item.str).join(" ") + '\n';
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.docx')) {
         if (file.name.endsWith('.docx')) {
            toast({
                title: 'File Type Note',
                description: `Full DOCX support is in progress. Text will be extracted, but formatting may be lost.`,
            });
         }
        extractedText = await file.text();
      } else {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please upload a PDF, DOCX, or text file.',
        });
        setIsParsing(false);
        return;
      }
      onAnalyze(extractedText, file.name);

    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        variant: 'destructive',
        title: 'File Parsing Failed',
        description: 'Could not extract text. Please paste the text manually.',
      });
    } finally {
      setIsParsing(false);
    }
    
    e.target.value = ''; // Reset file input
  }

  const handlePasteAndAnalyze = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.trim().length > 50) {
      onAnalyze(pastedText, 'Pasted Contract');
    } else {
      toast({
        title: "Paste Text",
        description: "Paste your full contract text to start the analysis."
      });
    }
  };

  const handleManualAnalyze = () => {
    if (pasteText.trim().length > 50) {
      onAnalyze(pasteText, 'Pasted Contract');
    } else {
      toast({
        variant: 'destructive',
        title: 'Text Too Short',
        description: 'Please enter at least 50 characters of contract text.',
      });
    }
  };

  const isDisabled = isParsing;

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Analyze a New Contract</h1>
            <p className="mt-3 text-lg text-muted-foreground">Get an instant AI summary and risk analysis for any legal document.</p>
        </div>

        <div className="glass-card rounded-xl p-6 max-w-4xl mx-auto">
            <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900/80">
                    <TabsTrigger value="upload">Upload File</TabsTrigger>
                    <TabsTrigger value="paste">Paste Text</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-6">
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.txt" disabled={isDisabled} />
                    <label htmlFor="file-upload" className="w-full flex items-center justify-center flex-col h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-white/5 hover:border-primary transition-colors group">
                        {isParsing ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />}
                        <p className="mt-4 font-semibold text-foreground">{isParsing ? 'Parsing File...' : 'Drag & drop your file here'}</p>
                        <p className="text-sm text-muted-foreground mt-1">Supported formats: PDF, DOCX (Max 20MB)</p>
                        <Button variant="outline" size="sm" className="mt-4 pointer-events-none bg-transparent">Browse Files</Button>
                    </label>
                    <p className="text-xs text-muted-foreground text-center mt-4">Your documents are encrypted and processed securely.</p>
                </TabsContent>
                <TabsContent value="paste" className="mt-6 space-y-4">
                    <Textarea
                        placeholder="Paste your contract text here to begin analysis, or type it manually below..."
                        onPaste={handlePasteAndAnalyze}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        className="min-h-[200px] text-sm bg-transparent"
                        disabled={isDisabled}
                    />
                    <Button
                        className="w-full"
                        onClick={handleManualAnalyze}
                        disabled={isDisabled || pasteText.trim().length <= 50}
                    >
                        Analyze Text
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}

function AnalyzePageWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user);
        setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#0B0C10] to-[#1A1A2E] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case will be handled by AuthGuard which redirects to login
    return null;
  }
  
  return <AnalyzePageComponent user={user} />;
}

export default function AnalyzePage() {
  return (
    <AuthGuard>
      <AnalyzePageWrapper />
    </AuthGuard>
  );
}
