import type { Metadata } from 'next';
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import { format } from 'date-fns';
import { getOverallRisk } from "@/lib/utils";
import type { Clause } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import styles from './report.module.css';

export const metadata: Metadata = {
  title: 'Contract Analysis Report',
};

export default async function ReportPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data, error } = await supabaseAdmin
    .from("contract_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return notFound();
  }

  const analysisData = data.analysis_data as Clause[] | undefined;

  const overallRisk = getOverallRisk(analysisData || []);

  const riskColor =
    overallRisk === "High"
      ? "#ef4444"
      : overallRisk === "Medium"
      ? "#f59e0b"
      : "#22c55e";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <PrintButton />

        <header className={styles.header}>
          <svg className={styles.logo} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"/><path d="M12 2v20"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="m20 19-1.5-1.5"/><path d="m4 5 1.5 1.5"/><path d="m20 5-1.5 1.5"/><path d="m4 19 1.5-1.5"/>
          </svg>
          <div>
            <h1>Contract Analysis Report</h1>
            <p><strong>File:</strong> {data.file_name}</p>
            <p><strong>Analyzed On:</strong> {format(new Date(data.analyzed_at), 'MMMM dd, yyyy')}</p>
          </div>
        </header>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryCardTitle}>Overall Risk</p>
            <p className={styles.summaryCardValue} style={{ color: riskColor }}>{overallRisk}</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryCardTitle}>Total Clauses</p>
            <p className={styles.summaryCardValue}>{data.clauses_count}</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryCardTitle}>High-Risk Clauses</p>
            <p className={styles.summaryCardValue} style={{ color: '#ef4444' }}>{data.high_risk_clauses_count}</p>
          </div>
        </div>

        <section>
          <h2>Clause-by-Clause Breakdown</h2>
          {analysisData && analysisData.map((clause, index) => (
            <div key={index} className={styles.clauseCard}>
              <div className={styles.clauseHeader}>
                <h3>{clause.clauseType}</h3>
                <span className={`${styles.riskBadge} ${styles[`risk${clause.riskLevel}` as keyof typeof styles]}`}>
                  {clause.riskLevel} Risk
                </span>
              </div>
              <div>
                <h4>Plain English Summary</h4>
                <p>{clause.summary}</p>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <h4>Risk Analysis</h4>
                <p>{clause.riskReason}</p>
              </div>
              {(clause.riskLevel === 'High' || clause.riskLevel === 'Medium') && clause.recommendation && (
                <div style={{ marginTop: '1rem' }}>
                  <h4>Recommendation</h4>
                  <p>{clause.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
