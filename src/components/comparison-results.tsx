
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { MultiCompareContractsOutput, RiskDifferenceSchema } from '@/ai/schemas/compare-contracts-schema';
import ComparisonSummaryCard from './comparison-summary-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const RiskIcon = ({ level }: { level: string }) => {
    switch (level) {
        case 'High': return <ShieldAlert className="h-4 w-4 text-red-500" />;
        case 'Medium': return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
        case 'Low': return <ShieldCheck className="h-4 w-4 text-green-500" />;
        default: return null;
    }
}

const riskLevelToVariant = (level: string): 'high' | 'medium' | 'low' | 'secondary' => {
  switch (level) {
    case 'High': return 'high';
    case 'Medium': return 'medium';
    case 'Low': return 'low';
    default: return 'secondary';
  }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };


export default function ComparisonResults({ results }: { results: MultiCompareContractsOutput }) {
  const { contracts } = results;

  return (
    <motion.div 
      className="mt-8 sm:mt-12 space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
         <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">AI Executive Summary</h2>
            <p className="text-muted-foreground mt-2 max-w-3xl mx-auto text-sm sm:text-base">
              {results.globalSummary}
            </p>
          </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="text-xl sm:text-2xl font-heading">Contract Overview</CardTitle>
                <CardDescription>High-level statistics for each document.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contract</TableHead>
                            <TableHead>Risk Level</TableHead>
                            <TableHead className="text-right">Total Clauses</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contracts.map(c => {
                            const clauses = c.analysis.clauses ?? [];
                            const overallRisk = clauses.length > 0
                                ? clauses.reduce((prev, current) => (prev && prev.riskLevel === 'High') ? prev : current).riskLevel
                                : 'N/A';
                            return (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={riskLevelToVariant(overallRisk)}>
                                            {overallRisk}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{clauses.length}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
         <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Visual Risk Distribution</h2>
         <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {contracts.map(contract => (
                <ComparisonSummaryCard key={contract.id} contract={contract} />
            ))}
         </div>
      </motion.div>

      {results.riskDifferences && results.riskDifferences.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-heading">Risk Profile Changes</CardTitle>
              <CardDescription>Clauses that exist in both contracts but have different risk assessments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.riskDifferences.map((diff: RiskDifferenceSchema, index: number) => (
                  <div key={index} className="p-4 sm:p-6 border border-border rounded-lg bg-secondary/50">
                    <p className="font-semibold text-md sm:text-lg mb-4 text-foreground">{diff.clause}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                      <div className="text-left p-4 rounded-md bg-background/50">
                        <p className="text-sm text-muted-foreground mb-2">Contract A</p>
                         <Badge variant={riskLevelToVariant(diff.contractA_risk)} className="flex items-center gap-1.5 w-fit mb-3">
                            <RiskIcon level={diff.contractA_risk} />
                            {diff.contractA_risk} Risk
                        </Badge>
                        <p className="text-sm text-muted-foreground">{diff.contractA_reason}</p>
                      </div>
                      <div className="text-left p-4 rounded-md bg-background/50">
                        <p className="text-sm text-muted-foreground mb-2">Contract B</p>
                        <Badge variant={riskLevelToVariant(diff.contractB_risk)} className="flex items-center gap-1.5 w-fit mb-3">
                            <RiskIcon level={diff.contractB_risk} />
                            {diff.contractB_risk} Risk
                        </Badge>
                        <p className="text-sm text-muted-foreground">{diff.contractB_reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
