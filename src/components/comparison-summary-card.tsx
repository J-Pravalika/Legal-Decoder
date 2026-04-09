
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { getOverallRisk } from '@/lib/utils';
import { ContractWithAnalysis } from '@/ai/schemas/compare-contracts-schema';
import { useMemo } from 'react';

type RiskDistribution = {
  name: string;
  value: number;
};

type ComparisonSummaryCardProps = {
  contract: ContractWithAnalysis;
};

const PIE_CHART_COLORS = {
  High: 'hsl(var(--risk-high))',
  Medium: 'hsl(var(--risk-medium))',
  Low: 'hsl(var(--risk-low))',
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

export default function ComparisonSummaryCard({ contract }: ComparisonSummaryCardProps) {

   const { riskDistribution, overallRisk } = useMemo(() => {
    const clauses = contract.analysis.clauses ?? [];
    const dist = clauses.reduce((acc, clause) => {
        const key = clause.riskLevel as keyof typeof PIE_CHART_COLORS;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<'High' | 'Medium' | 'Low', number>);

    const distribution = Object.entries(dist)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

    return {
      riskDistribution: distribution,
      overallRisk: getOverallRisk(clauses),
    };
  }, [contract.analysis]);
  
  return (
    <motion.div variants={itemVariants}>
        <Card className="glass-card h-full">
            <CardHeader>
                <CardTitle className="text-xl font-heading !text-white truncate">{contract.name}</CardTitle>
                <CardDescription className="!text-muted-foreground italic">
                    Overall Risk: {overallRisk}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {riskDistribution.length > 0 ? (
                  <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                                contentStyle={{
                                    background: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                              <Pie
                                  data={riskDistribution}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                  nameKey="name"
                                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              >
                                  {riskDistribution.map((entry) => (
                                      <Cell key={`cell-${entry.name}`} fill={PIE_CHART_COLORS[entry.name as keyof typeof PIE_CHART_COLORS]} />
                                  ))}
                              </Pie>
                              <Legend formatter={(value) => <span className="text-white/80">{value}</span>} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                ) : (
                    <div className='text-center text-muted-foreground h-[150px] flex items-center justify-center'>
                        No risk data available.
                    </div>
                )}
            </CardContent>
        </Card>
    </motion.div>
  );
}
