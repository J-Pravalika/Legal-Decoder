import {NextResponse} from 'next/server';
import {detectAndLabelClauses} from '@/ai/flows/detect-and-label-clauses';
import {type DetectAndLabelClausesOutput} from '@/ai/schemas/detect-and-label-clauses-schema';
import {getOverallRisk} from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const { userId, fileName, contractText } = await req.json();

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 }
    );
  }

  if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({error: 'GROQ_API_KEY is missing from environment variables.'}, {status: 500});
  }
  
  if (!contractText || contractText.trim().length < 50) {
    return NextResponse.json({error: 'Contract text is too short. Please provide a valid contract.'}, {status: 400});
  }

  console.log(`Starting analysis for: ${fileName}, User: ${userId}`);

  // 1. Create initial record in DB with 'Analyzing' status
  const {data: initialRecord, error: insertError} = await supabaseAdmin
    .from('contract_analyses')
    .insert([
      {
        user_id: userId,
        file_name: fileName,
        status: 'Analyzing',
        clauses_count: 0,
        high_risk_clauses_count: 0,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating initial analysis record:', insertError);
    return NextResponse.json(
      {
        error: 'Failed to initiate analysis in the database. ' + insertError.message,
      },
      {status: 500}
    );
  }

  const analysisId = initialRecord.id;
  console.log(`Analysis record created with ID: ${analysisId}`);

  try {
    // 2. Run the AI analysis
    const analysisResult: DetectAndLabelClausesOutput = await detectAndLabelClauses({contractText});
    console.log(`AI response received for analysis ID: ${analysisId}`);
    
    if (analysisResult.extractedEmails && analysisResult.extractedEmails.length > 0) {
        console.log(`✉️ Extracted Emails:`, analysisResult.extractedEmails);
    }


    // 3. Update DB record on success
    const overallRisk = getOverallRisk(analysisResult.clauses);
    const highRiskCount = analysisResult.clauses.filter(c => c.riskLevel === 'High').length;

    const {data: updatedRecord, error: updateError} = await supabaseAdmin
      .from('contract_analyses')
      .update({
        status: 'Analyzed',
        risk_level: overallRisk,
        clauses_count: analysisResult.clauses.length,
        high_risk_clauses_count: highRiskCount,
        analysis_data: analysisResult.clauses, // Store only the clauses array here
        extracted_emails: analysisResult.extractedEmails, // Store emails in the new column
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', analysisId)
      .select()
      .single();

    if (updateError) {
      // The analysis succeeded, but DB update failed. Log it, but return success to user.
      console.error('Error updating analysis record after success:', updateError);
      // We can still return the analysis to the user.
    }
    
    console.log(`Database update success for analysis ID: ${analysisId}`);
    return NextResponse.json({success: true, data: updatedRecord});

  } catch (error: any) {
    console.error(`Analysis failed for ID: ${analysisId} with error:`, error.message);

    // 4. Update DB record on failure
    const {error: errorUpdateError} = await supabaseAdmin
      .from('contract_analyses')
      .update({
        status: 'Error',
        analysis_data: {error: error.message},
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    if (errorUpdateError) {
        console.error('CRITICAL: Failed to update analysis status to Error:', errorUpdateError);
    }
    
    return NextResponse.json(
        {
          error: error.message || 'Failed to analyze the contract due to an unexpected error.',
        },
        {status: 500}
      );
  }
}
